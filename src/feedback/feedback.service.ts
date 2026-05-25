import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './feedback.entity';
import { CreateFeedbackDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(@InjectRepository(Feedback) private readonly repo: Repository<Feedback>) {}

  findApproved(): Promise<Feedback[]> {
    return this.repo.find({ where: { isApproved: true, showOnSite: true }, order: { createdAt: 'DESC' } });
  }

  findAll(): Promise<Feedback[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  create(dto: CreateFeedbackDto): Promise<Feedback> {
    const fb = this.repo.create(dto);
    return this.repo.save(fb);
  }

  async approve(id: string): Promise<Feedback | null> {
    await this.repo.update(id, { isApproved: true });
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
