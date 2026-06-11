import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resend } from 'resend';
import { EmailFolder, EmailMessage } from './email-message.entity';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { SaveDraftDto, SendEmailDto } from './dto/email.dto';

@Injectable()
export class EmailService {
    constructor(
        @InjectRepository(EmailMessage) private readonly repo: Repository<EmailMessage>,
        private readonly adminSettings: AdminSettingsService,
    ) { }

    async send(dto: SendEmailDto): Promise<EmailMessage> {
        const settings = await this.adminSettings.getSettings();
        if (!settings.emailEnabled || !settings.resendApiKey || !settings.emailFromAddress) {
            throw new BadRequestException('Email sending is not configured');
        }

        const resend = new Resend(settings.resendApiKey);
        const result = await resend.emails.send({
            from: `${settings.emailFromName} <${settings.emailFromAddress}>`,
            to: dto.to,
            cc: dto.cc,
            subject: dto.subject,
            html: dto.html,
        });

        const saved = await this.repo.save(this.repo.create({
            folder: 'sent',
            to: dto.to.join(', '),
            cc: dto.cc?.join(', ') ?? null,
            subject: dto.subject,
            body: dto.html,
            status: result.error ? 'failed' : 'sent',
            resendMessageId: result.data?.id ?? null,
            relatedLeadId: dto.relatedLeadId ?? null,
            relatedInquiryId: dto.relatedInquiryId ?? null,
        }));

        if (result.error) {
            throw new BadRequestException(result.error.message);
        }

        return saved;
    }

    getMessages(folder: EmailFolder): Promise<EmailMessage[]> {
        return this.repo.find({ where: { folder }, order: { createdAt: 'DESC' } });
    }

    saveDraft(dto: SaveDraftDto): Promise<EmailMessage> {
        return this.repo.save(this.repo.create({
            folder: 'draft',
            to: dto.to?.join(', ') ?? '',
            cc: dto.cc?.join(', ') ?? null,
            subject: dto.subject ?? null,
            body: dto.html ?? '',
            status: 'draft',
        }));
    }

    async updateDraft(id: string, dto: SaveDraftDto): Promise<EmailMessage> {
        const draft = await this.repo.findOne({ where: { id, folder: 'draft' } });
        if (!draft) throw new NotFoundException('Draft not found');

        if (dto.to) draft.to = dto.to.join(', ');
        if (dto.cc) draft.cc = dto.cc.join(', ');
        if (dto.subject !== undefined) draft.subject = dto.subject;
        if (dto.html !== undefined) draft.body = dto.html;

        return this.repo.save(draft);
    }

    async deleteDraft(id: string): Promise<void> {
        await this.repo.delete({ id, folder: 'draft' });
    }
}
