import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry, InquiryStatus } from './inquiry.entity';
import { CreateInquiryDto, ReplyInquiryDto } from './dto/inquiry.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';
import { EventsGateway } from '../events/events.gateway';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { LeadsService } from '../leads/leads.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class InquiriesService {
    constructor(
        @InjectRepository(Inquiry) private readonly repo: Repository<Inquiry>,
        private readonly notifications: NotificationsService,
        private readonly fcm: FcmService,
        private readonly events: EventsGateway,
        private readonly activityLog: ActivityLogService,
        private readonly leads: LeadsService,
        private readonly email: EmailService,
    ) { }

    findAll(): Promise<Inquiry[]> {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }

    async create(dto: CreateInquiryDto): Promise<Inquiry> {
        const inquiry = this.repo.create(dto);
        const lead = await this.leads.findOrCreateFromInquiry({
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            message: dto.message,
        });
        inquiry.leadId = lead.id;
        const saved = await this.repo.save(inquiry);
        this.notifications.emit('new_inquiry');
        this.events.emitToAdmin('inquiry:new', saved);
        this.fcm.sendPush({
            title: '📬 New Inquiry',
            body: `${dto.name} sent a message: "${dto.subject ?? dto.message.slice(0, 60)}"`,
            url: '/admin/email?folder=inquiries',
            source: PushNotifSource.INQUIRY,
        });
        this.activityLog.log({
            action: 'inquiry:received',
            resource: 'inquiry',
            resourceId: saved.id,
            resourceTitle: dto.name,
            description: `${dto.name} <${dto.email}>`,
        });
        return saved;
    }

    async markRead(id: string): Promise<Inquiry | null> {
        await this.repo.update(id, { status: InquiryStatus.READ });
        this.notifications.emit('inquiry_updated');
        const inquiry = await this.repo.findOne({ where: { id } });
        if (inquiry) {
            this.events.emitToAdmin('inquiry:read', { id, status: inquiry.status });
            this.activityLog.log({
                action: 'inquiry:read',
                resource: 'inquiry',
                resourceId: id,
                resourceTitle: inquiry.name,
                description: inquiry.name,
            });
        }
        return inquiry;
    }

    async remove(id: string): Promise<void> {
        const inquiry = await this.repo.findOne({ where: { id } });
        await this.repo.delete(id);
        this.notifications.emit('inquiry_updated');
        this.events.emitToAdmin('inquiry:deleted', { id });
        this.activityLog.log({
            action: 'inquiry:delete',
            resource: 'inquiry',
            resourceId: id,
            resourceTitle: inquiry?.name,
            description: inquiry?.name ?? '—',
        });
    }

    async stats() {
        const total = await this.repo.count();
        const newCount = await this.repo.count({ where: { status: InquiryStatus.NEW } });
        return { total, new: newCount };
    }

    async reply(id: string, dto: ReplyInquiryDto): Promise<Inquiry> {
        const inquiry = await this.repo.findOne({ where: { id } });
        if (!inquiry) throw new NotFoundException('Inquiry not found');

        await this.email.send({
            to: [inquiry.email],
            subject: dto.subject,
            html: dto.html,
            relatedInquiryId: inquiry.id,
            relatedLeadId: inquiry.leadId ?? undefined,
        });

        await this.repo.update(id, { status: InquiryStatus.REPLIED });
        const updated = await this.repo.findOne({ where: { id } });
        this.events.emitToAdmin('inquiry:read', { id, status: InquiryStatus.REPLIED });
        this.activityLog.log({
            action: 'inquiry:replied',
            resource: 'inquiry',
            resourceId: id,
            resourceTitle: inquiry.name,
            description: `Replied to ${inquiry.name} <${inquiry.email}>`,
        });
        return updated!;
    }
}
