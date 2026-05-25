import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { Project } from '../projects/project.entity';
import { Blog } from '../blogs/blog.entity';
import { Inquiry } from '../inquiries/inquiry.entity';
import { Feedback } from '../feedback/feedback.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Blog, Inquiry, Feedback])],
  controllers: [AdminController],
})
export class AdminModule {}
