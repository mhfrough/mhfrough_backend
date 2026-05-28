import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './feedback.entity';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';
import { EventsGateway } from '../events/events.gateway';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class FeedbackService {
    constructor(
        @InjectRepository(Feedback) private readonly repo: Repository<Feedback>,
        private readonly notifications: NotificationsService,
        private readonly fcm: FcmService,
        private readonly events: EventsGateway,
        private readonly activityLog: ActivityLogService,
    ) { }

    findApproved(): Promise<Feedback[]> {
        return this.repo.find({ where: { isApproved: true, showOnSite: true }, order: { createdAt: 'DESC' } });
    }

    async findApprovedPaginated(page: number, limit: number, q?: string) {
        const qb = this.repo.createQueryBuilder('feedback')
            .where('feedback.isApproved = :approved', { approved: true })
            .andWhere('feedback.showOnSite = :show', { show: true });

        if (q) {
            qb.andWhere(
                '(feedback.name ILIKE :q OR feedback.role ILIKE :q OR feedback.company ILIKE :q OR feedback.review ILIKE :q)',
                { q: `%${q}%` },
            );
        }

        qb.orderBy('feedback.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
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
        this.activityLog.log({
            action: 'feedback:received',
            resource: 'feedback',
            resourceId: saved.id,
            resourceTitle: dto.name,
            description: `${dto.name} · ${dto.rating}★`,
        });
        return saved;
    }

    async approve(id: string): Promise<Feedback | null> {
        await this.repo.update(id, { isApproved: true });
        this.notifications.emit('feedback_updated');
        const feedback = await this.repo.findOne({ where: { id } });
        if (feedback) {
            this.events.emitToAll('feedback:approved', feedback);
            this.activityLog.log({
                action: 'feedback:approve',
                resource: 'feedback',
                resourceId: id,
                resourceTitle: feedback.name,
                description: feedback.name,
            });
        }
        return feedback;
    }

    async unapprove(id: string, adminNote?: string): Promise<Feedback | null> {
        const update: Partial<Feedback> = { isApproved: false };
        if (adminNote !== undefined) update.adminNote = adminNote;
        await this.repo.update(id, update);
        this.notifications.emit('feedback_updated');
        this.events.emitToAll('feedback:unapproved', { id });
        const feedback = await this.repo.findOne({ where: { id } });
        this.activityLog.log({
            action: 'feedback:disapprove',
            resource: 'feedback',
            resourceId: id,
            resourceTitle: feedback?.name,
            description: feedback?.name ?? '—',
        });
        return feedback;
    }

    async remove(id: string): Promise<void> {
        const feedback = await this.repo.findOne({ where: { id } });
        await this.repo.delete(id);
        this.notifications.emit('feedback_updated');
        this.events.emitToAll('feedback:deleted', { id });
        this.activityLog.log({
            action: 'feedback:delete',
            resource: 'feedback',
            resourceId: id,
            resourceTitle: feedback?.name,
            description: feedback?.name ?? '—',
        });
    }
}
