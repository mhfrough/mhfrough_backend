import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';
import { ChatSession } from '../chat/chat-session.entity';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

const LEAD_RELATIONS = ['inquiries', 'appointments', 'invoices', 'chatSessions'];

@Injectable()
export class LeadsService {
    constructor(
        @InjectRepository(Lead) private readonly repo: Repository<Lead>,
        @InjectRepository(ChatSession) private readonly chatSessionRepo: Repository<ChatSession>,
        private readonly activityLog: ActivityLogService,
    ) { }

    findAll(): Promise<Lead[]> {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }

    async findOne(id: string): Promise<Lead> {
        const lead = await this.repo.findOne({ where: { id }, relations: LEAD_RELATIONS });
        if (!lead) throw new NotFoundException('Lead not found');
        return lead;
    }

    async create(dto: CreateLeadDto): Promise<Lead> {
        const { chatSessionId, ...rest } = dto;
        const lead = this.repo.create({
            ...rest,
            source: dto.source ?? 'manual',
            status: dto.status ?? 'new',
        });
        const saved = await this.repo.save(lead);

        if (chatSessionId) {
            await this.chatSessionRepo.update(chatSessionId, { leadId: saved.id });
        }

        this.activityLog.log({
            action: 'lead:create',
            resource: 'lead',
            resourceId: saved.id,
            resourceTitle: saved.name,
            description: `${saved.name} <${saved.email}> · source: ${saved.source}`,
        });
        return saved;
    }

    async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
        const lead = await this.findOne(id);
        Object.assign(lead, dto);
        const saved = await this.repo.save(lead);
        this.activityLog.log({
            action: 'lead:update',
            resource: 'lead',
            resourceId: saved.id,
            resourceTitle: saved.name,
            description: `${saved.name} · ${saved.status}`,
        });
        return saved;
    }

    async remove(id: string): Promise<void> {
        const lead = await this.findOne(id);
        await this.repo.remove(lead);
        this.activityLog.log({
            action: 'lead:delete',
            resource: 'lead',
            resourceId: id,
            resourceTitle: lead.name,
            description: lead.name,
        });
    }

    /**
     * Finds an existing lead by email so repeat inquiries from the same person
     * don't fragment their pipeline history. Otherwise creates a new lead from
     * the inquiry's contact details.
     */
    async findOrCreateFromInquiry(data: { name: string; email: string; phone?: string; message: string }): Promise<Lead> {
        const existing = await this.repo.findOne({ where: { email: data.email } });
        if (existing) return existing;

        const lead = this.repo.create({
            name: data.name,
            email: data.email,
            phone: data.phone ?? null,
            source: 'email',
            status: 'new',
            projectSummary: data.message.slice(0, 500),
        });
        const saved = await this.repo.save(lead);
        this.activityLog.log({
            action: 'lead:create',
            resource: 'lead',
            resourceId: saved.id,
            resourceTitle: saved.name,
            description: `${saved.name} <${saved.email}> · source: email`,
        });
        return saved;
    }

    /**
     * Finds an existing lead by email so a returning chat visitor doesn't
     * fragment their pipeline history. Otherwise creates a new lead from the
     * contact details captured during a chat conversation.
     */
    async findOrCreateFromChat(data: { name: string; email: string; phone?: string; projectSummary?: string }): Promise<Lead> {
        const existing = await this.repo.findOne({ where: { email: data.email } });
        if (existing) {
            let changed = false;
            if (!existing.phone && data.phone) { existing.phone = data.phone; changed = true; }
            if (!existing.projectSummary && data.projectSummary) { existing.projectSummary = data.projectSummary.slice(0, 500); changed = true; }
            if (changed) await this.repo.save(existing);
            return existing;
        }

        const lead = this.repo.create({
            name: data.name,
            email: data.email,
            phone: data.phone ?? null,
            source: 'chat',
            status: 'new',
            projectSummary: data.projectSummary?.slice(0, 500) ?? null,
        });
        const saved = await this.repo.save(lead);
        this.activityLog.log({
            action: 'lead:create',
            resource: 'lead',
            resourceId: saved.id,
            resourceTitle: saved.name,
            description: `${saved.name} <${saved.email}> · source: chat`,
        });
        return saved;
    }

    /**
     * Bumps a lead's status forward in the pipeline, never downgrading a
     * resolved (`won`/`lost`) lead and never moving status backwards.
     */
    async advanceStatus(id: string, status: Lead['status']): Promise<void> {
        const ORDER: Record<string, number> = { new: 0, contacted: 1, qualified: 2, quoted: 3, won: 4, lost: 4 };
        const lead = await this.repo.findOne({ where: { id } });
        if (!lead) return;
        if (ORDER[lead.status] >= ORDER[status]) return;
        lead.status = status;
        await this.repo.save(lead);
    }
}
