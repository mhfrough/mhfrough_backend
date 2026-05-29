import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TickerMessage } from './ticker-message.entity';
import { CreateTickerMessageDto, UpdateTickerMessageDto } from './dto/ticker-message.dto';

@Injectable()
export class TickerService {
    constructor(
        @InjectRepository(TickerMessage) private readonly repo: Repository<TickerMessage>,
    ) { }

    async findAllAdmin(
        page: number,
        limit: number,
        q?: string,
    ): Promise<{ data: TickerMessage[]; total: number; page: number; limit: number; totalPages: number }> {
        const qb = this.repo.createQueryBuilder('t');
        if (q) {
            qb.where('t.message ILIKE :q', { q: `%${q}%` });
        }
        qb.orderBy('t.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    findPublished(): Promise<TickerMessage[]> {
        const now = new Date();
        return this.repo
            .createQueryBuilder('t')
            .where('t.isPublished = true')
            .andWhere('(t.autoDeactivateAt IS NULL OR t.autoDeactivateAt > :now)', { now })
            .orderBy('t.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: string): Promise<TickerMessage> {
        const item = await this.repo.findOne({ where: { id } });
        if (!item) throw new NotFoundException('Ticker message not found');
        return item;
    }

    create(dto: CreateTickerMessageDto): Promise<TickerMessage> {
        return this.repo.save(this.repo.create(dto));
    }

    async update(id: string, dto: UpdateTickerMessageDto): Promise<TickerMessage> {
        await this.findOne(id);
        await this.repo.update(id, dto as Partial<TickerMessage>);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        await this.findOne(id);
        await this.repo.delete(id);
    }
}
