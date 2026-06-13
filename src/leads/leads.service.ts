import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './lead.entity';
import { ChatSession } from '../chat/chat-session.entity';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EventsGateway } from '../events/events.gateway';

const LEAD_RELATIONS = ['inquiries', 'appointments', 'invoices', 'chatSessions'];

@Injectable()
export class LeadsService {
    constructor(
        @InjectRepository(Lead) private readonly repo: Repository<Lead>,
        @InjectRepository(ChatSession) private readonly chatSessionRepo: Repository<ChatSession>,
        private readonly activityLog: ActivityLogService,
        private readonly events: EventsGateway,
    ) { }

    /**
     * Canonicalises an email (trim + lowercase) so lead dedup-by-email is
     * case/whitespace insensitive — otherwise "John@X.com" and "john@x.com"
     * would fragment the same person's pipeline into separate leads.
     */
    private static normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    findAll(): Promise<Lead[]> {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }

    /**
     * Pipeline summary for the admin dashboard: total leads, counts per status,
     * how many are still open (not won/lost), win rate among resolved leads,
     * and a breakdown by acquisition source.
     */
    async getStats(): Promise<{
        total: number;
        open: number;
        winRate: number;
        byStatus: Record<LeadStatus, number>;
        bySource: { source: string; count: number }[];
    }> {
        const [statusRows, sourceRows] = await Promise.all([
            this.repo.createQueryBuilder('l')
                .select('l.status', 'status').addSelect('COUNT(*)', 'count')
                .groupBy('l.status').getRawMany<{ status: LeadStatus; count: string }>(),
            this.repo.createQueryBuilder('l')
                .select('l.source', 'source').addSelect('COUNT(*)', 'count')
                .groupBy('l.source').getRawMany<{ source: string; count: string }>(),
        ]);

        const byStatus: Record<LeadStatus, number> = {
            new: 0, contacted: 0, qualified: 0, quoted: 0, won: 0, lost: 0,
        };
        let total = 0;
        for (const r of statusRows) {
            const count = Number(r.count);
            if (r.status in byStatus) byStatus[r.status] = count;
            total += count;
        }

        const resolved = byStatus.won + byStatus.lost;
        const winRate = resolved > 0 ? Math.round((byStatus.won / resolved) * 100) : 0;
        const open = total - byStatus.won - byStatus.lost;
        const bySource = sourceRows
            .map(r => ({ source: r.source, count: Number(r.count) }))
            .sort((a, b) => b.count - a.count);

        return { total, open, winRate, byStatus, bySource };
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
            email: LeadsService.normalizeEmail(rest.email),
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
        this.events.emitToAdmin('lead:created', saved);
        return saved;
    }

    async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
        const lead = await this.findOne(id);
        Object.assign(lead, dto);
        if (dto.email) lead.email = LeadsService.normalizeEmail(dto.email);
        const saved = await this.repo.save(lead);
        this.activityLog.log({
            action: 'lead:update',
            resource: 'lead',
            resourceId: saved.id,
            resourceTitle: saved.name,
            description: `${saved.name} · ${saved.status}`,
        });
        this.events.emitToAdmin('lead:updated', saved);
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
        this.events.emitToAdmin('lead:deleted', { id });
    }

    /**
     * Finds an existing lead by email so repeat inquiries from the same person
     * don't fragment their pipeline history. Otherwise creates a new lead from
     * the inquiry's contact details.
     */
    async findOrCreateFromInquiry(data: { name: string; email: string; phone?: string; message: string }): Promise<Lead> {
        const email = LeadsService.normalizeEmail(data.email);
        const existing = await this.repo.findOne({ where: { email } });
        if (existing) return existing;

        const lead = this.repo.create({
            name: data.name,
            email,
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
        this.events.emitToAdmin('lead:created', saved);
        return saved;
    }

    /**
     * Finds an existing lead by email so a returning chat visitor doesn't
     * fragment their pipeline history. Otherwise creates a new lead from the
     * contact details captured during a chat conversation.
     */
    async findOrCreateFromChat(data: { name: string; email: string; phone?: string; projectSummary?: string }): Promise<Lead> {
        const email = LeadsService.normalizeEmail(data.email);
        const existing = await this.repo.findOne({ where: { email } });
        if (existing) {
            let changed = false;
            if (!existing.phone && data.phone) { existing.phone = data.phone; changed = true; }
            if (!existing.projectSummary && data.projectSummary) { existing.projectSummary = data.projectSummary.slice(0, 500); changed = true; }
            if (changed) {
                await this.repo.save(existing);
                this.events.emitToAdmin('lead:updated', existing);
            }
            return existing;
        }

        const lead = this.repo.create({
            name: data.name,
            email,
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
        this.events.emitToAdmin('lead:created', saved);
        return saved;
    }

    /**
     * Fills in any currently-empty contact/qualification fields on a lead
     * (phone, website, budget) without overwriting data the lead already has.
     */
    async mergeCapturedInfo(id: string, data: { phone?: string; website?: string; budget?: string }): Promise<Lead> {
        const lead = await this.repo.findOne({ where: { id } });
        if (!lead) throw new NotFoundException('Lead not found');

        let changed = false;
        if (!lead.phone && data.phone) { lead.phone = data.phone; changed = true; }
        if (!lead.website && data.website) { lead.website = data.website; changed = true; }
        if (!lead.budget && data.budget) { lead.budget = data.budget; changed = true; }

        if (!changed) return lead;
        const saved = await this.repo.save(lead);
        this.events.emitToAdmin('lead:updated', saved);
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
        this.events.emitToAdmin('lead:updated', lead);
    }
}
