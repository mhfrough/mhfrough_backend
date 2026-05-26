import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './feedback.entity';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class FeedbackService {
    constructor(
        @InjectRepository(Feedback) private readonly repo: Repository<Feedback>,
        private readonly notifications: NotificationsService,
        private readonly fcm: FcmService,
        private readonly events: EventsGateway,
    ) { }

    findApproved(): Promise<Feedback[]> {
        return this.repo.find({ where: { isApproved: true, showOnSite: true }, order: { createdAt: 'DESC' } });
    }

    findAll(): Promise<Feedback[]> {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }

    async create(dto: CreateFeedbackDto): Promise<Feedback> {
        const fb = this.repo.create(dto);
        const saved = await this.repo.save(fb);
        this.notifications.emit('new_feedback');
        this.events.emitToAdmin('feedback:new', saved);
        this.fcm.sendPush({
            title: '⭐ New Review',
            body: `${dto.name} left a ${dto.rating}-star review: "${dto.review.slice(0, 80)}"`,
            url: '/admin/feedback',
            source: PushNotifSource.FEEDBACK,
        });
        return saved;
    }

    async approve(id: string): Promise<Feedback | null> {
        await this.repo.update(id, { isApproved: true });
        this.notifications.emit('feedback_updated');
        const feedback = await this.repo.findOne({ where: { id } });
        // emit to all: admin list updates + public reviews page shows the new review
        if (feedback) this.events.emitToAll('feedback:approved', feedback);
        return feedback;
    }

    async unapprove(id: string, adminNote?: string): Promise<Feedback | null> {
        const update: Partial<Feedback> = { isApproved: false };
        if (adminNote !== undefined) update.adminNote = adminNote;
        await this.repo.update(id, update);
        this.notifications.emit('feedback_updated');
        this.events.emitToAll('feedback:unapproved', { id });
        return this.repo.findOne({ where: { id } });
    }

    async remove(id: string): Promise<void> {
        await this.repo.delete(id);
        this.notifications.emit('feedback_updated');
        this.events.emitToAll('feedback:deleted', { id });
    }
}
