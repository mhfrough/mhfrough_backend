import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './feedback.entity';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FeedbackService {
    constructor(
        @InjectRepository(Feedback) private readonly repo: Repository<Feedback>,
        private readonly notifications: NotificationsService,
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
        return saved;
    }

    async approve(id: string): Promise<Feedback | null> {
        await this.repo.update(id, { isApproved: true });
        this.notifications.emit('feedback_updated');
        return this.repo.findOne({ where: { id } });
    }

    async unapprove(id: string, adminNote?: string): Promise<Feedback | null> {
        const update: Partial<Feedback> = { isApproved: false };
        if (adminNote !== undefined) update.adminNote = adminNote;
        await this.repo.update(id, update);
        this.notifications.emit('feedback_updated');
        return this.repo.findOne({ where: { id } });
    }

    async remove(id: string): Promise<void> {
        await this.repo.delete(id);
        this.notifications.emit('feedback_updated');
    }
}
