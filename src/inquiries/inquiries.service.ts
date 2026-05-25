import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry, InquiryStatus } from './inquiry.entity';
import { CreateInquiryDto } from './dto/inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(@InjectRepository(Inquiry) private readonly repo: Repository<Inquiry>) {}

  findAll(): Promise<Inquiry[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  create(dto: CreateInquiryDto): Promise<Inquiry> {
    const inquiry = this.repo.create(dto);
    return this.repo.save(inquiry);
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
