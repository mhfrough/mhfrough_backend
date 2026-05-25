import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Project } from '../projects/project.entity';
import { Blog } from '../blogs/blog.entity';
import { Inquiry } from '../inquiries/inquiry.entity';
import { Feedback } from '../feedback/feedback.entity';
import { InquiryStatus } from '../inquiries/inquiry.entity';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(Blog) private blogs: Repository<Blog>,
    @InjectRepository(Inquiry) private inquiries: Repository<Inquiry>,
    @InjectRepository(Feedback) private feedback: Repository<Feedback>,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard statistics' })
  async dashboard() {
    const [totalProjects, totalBlogs, totalInquiries, newInquiries, pendingFeedback, totalFeedback] =
      await Promise.all([
        this.projects.count(),
        this.blogs.count(),
        this.inquiries.count(),
        this.inquiries.count({ where: { status: InquiryStatus.NEW } }),
        this.feedback.count({ where: { isApproved: false } }),
        this.feedback.count(),
      ]);

    return {
      projects: { total: totalProjects },
      blogs: { total: totalBlogs },
      inquiries: { total: totalInquiries, new: newInquiries },
      feedback: { total: totalFeedback, pending: pendingFeedback },
    };
  }
}
