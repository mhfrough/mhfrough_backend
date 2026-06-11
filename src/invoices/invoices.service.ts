import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepo: Repository<Invoice>,
        @InjectRepository(InvoiceItem)
        private readonly itemRepo: Repository<InvoiceItem>,
        private readonly activityLog: ActivityLogService,
        private readonly leads: LeadsService,
    ) { }

    findAll(): Promise<Invoice[]> {
        return this.invoiceRepo.find({ order: { createdAt: 'DESC' } });
    }

    async findOne(id: string): Promise<Invoice> {
        const inv = await this.invoiceRepo.findOne({ where: { id } });
        if (!inv) throw new NotFoundException('Invoice not found');
        return inv;
    }

    async create(dto: CreateInvoiceDto): Promise<Invoice> {
        const invoiceNumber = await this.generateInvoiceNumber();
        const { items: rawItems, taxRate = 0, ...rest } = dto;

        const itemEntities = rawItems.map((item, i) =>
            this.itemRepo.create({
                ...item,
                total: +(Number(item.quantity) * Number(item.unitPrice)).toFixed(2),
                sortOrder: item.sortOrder ?? i,
            }),
        );

        const subtotal = +itemEntities
            .reduce((acc, it) => acc + Number(it.total), 0)
            .toFixed(2);
        const taxAmount = +((subtotal * taxRate) / 100).toFixed(2);
        const total = +(subtotal + taxAmount).toFixed(2);

        const invoice = this.invoiceRepo.create({
            ...rest,
            invoiceNumber,
            items: itemEntities,
            subtotal,
            taxRate,
            taxAmount,
            total,
            status: dto.status ?? 'draft',
        });

        const saved = await this.invoiceRepo.save(invoice);
        this.activityLog.log({
            action: 'invoice:create',
            resource: 'invoice',
            resourceId: saved.id,
            resourceTitle: saved.invoiceNumber,
            description: `${saved.invoiceNumber} · ${saved.clientName}`,
        });
        if (saved.leadId) {
            await this.leads.advanceStatus(saved.leadId, 'quoted');
        }
        return saved;
    }

    async update(id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
        const inv = await this.findOne(id);

        // Remove old items first — cascade will handle new ones on save
        await this.itemRepo.delete({ invoice: { id } });

        const { items: rawItems, taxRate = 0, ...rest } = dto;

        const itemEntities = rawItems.map((item, i) =>
            this.itemRepo.create({
                ...item,
                total: +(Number(item.quantity) * Number(item.unitPrice)).toFixed(2),
                sortOrder: item.sortOrder ?? i,
            }),
        );

        const subtotal = +itemEntities
            .reduce((acc, it) => acc + Number(it.total), 0)
            .toFixed(2);
        const taxAmount = +((subtotal * taxRate) / 100).toFixed(2);
        const total = +(subtotal + taxAmount).toFixed(2);

        Object.assign(inv, {
            ...rest,
            items: itemEntities,
            subtotal,
            taxRate,
            taxAmount,
            total,
        });

        const saved = await this.invoiceRepo.save(inv);
        this.activityLog.log({
            action: 'invoice:update',
            resource: 'invoice',
            resourceId: saved.id,
            resourceTitle: saved.invoiceNumber,
            description: `${saved.invoiceNumber} · $${saved.total}`,
        });
        if (saved.leadId && saved.status === 'paid') {
            await this.leads.advanceStatus(saved.leadId, 'won');
        }
        return saved;
    }

    async remove(id: string): Promise<void> {
        const inv = await this.findOne(id);
        const invoiceNumber = inv.invoiceNumber;
        const clientName = inv.clientName;
        await this.invoiceRepo.remove(inv);
        this.activityLog.log({
            action: 'invoice:delete',
            resource: 'invoice',
            resourceId: id,
            resourceTitle: invoiceNumber,
            description: `${invoiceNumber} · ${clientName}`,
        });
    }

    private async generateInvoiceNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;

        const latest = await this.invoiceRepo
            .createQueryBuilder('invoice')
            .where('invoice.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('invoice.invoiceNumber', 'DESC')
            .getOne();

        let seq = 1;
        if (latest) {
            const parts = latest.invoiceNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            seq = isNaN(lastSeq) ? 1 : lastSeq + 1;
        }

        return `${prefix}${String(seq).padStart(4, '0')}`;
    }
}
