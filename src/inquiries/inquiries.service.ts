import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry, InquiryStatus } from './inquiry.entity';
import { CreateInquiryDto } from './dto/inquiry.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InquiriesService {
    constructor(
        @InjectRepository(Inquiry) private readonly repo: Repository<Inquiry>,
        private readonly notifications: NotificationsService,
    ) { }

    findAll(): Promise<Inquiry[]> {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }

    async create(dto: CreateInquiryDto): Promise<Inquiry> {
        const inquiry = this.repo.create(dto);
        const saved = await this.repo.save(inquiry);
        this.notifications.emit('new_inquiry');
        return saved;
    }

    async markRead(id: string): Promise<Inquiry | null> {
        await this.repo.update(id, { status: InquiryStatus.READ });
        return this.repo.findOne({ where: { id } });
    }

    async stats() {
        const total = await this.repo.count();
        const newCount = await this.repo.count({ where: { status: InquiryStatus.NEW } });
        return { total, new: newCount };
    }
}
