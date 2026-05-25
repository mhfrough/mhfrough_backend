import { Controller, Get, UseGuards, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Project } from '../projects/project.entity';
import { Blog } from '../blogs/blog.entity';
import { Inquiry, InquiryStatus } from '../inquiries/inquiry.entity';
import { Feedback } from '../feedback/feedback.entity';
import { NotificationsService } from '../notifications/notifications.service';

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
        private readonly notifications: NotificationsService,
    ) { }

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

    @Get('counts')
    @ApiOperation({ summary: 'Current unread/pending counts' })
    async counts() {
        const [newInquiries, pendingFeedback] = await Promise.all([
            this.inquiries.count({ where: { status: InquiryStatus.NEW } }),
            this.feedback.count({ where: { isApproved: false } }),
        ]);
        return { inquiries: { new: newInquiries }, feedback: { pending: pendingFeedback } };
    }

    @Sse('stream')
    @ApiOperation({ summary: 'Real-time admin event stream (SSE)' })
    stream(): Observable<MessageEvent> {
        return this.notifications.getStream().pipe(
            map(event => ({ data: event }) as MessageEvent),
        );
    }
}
