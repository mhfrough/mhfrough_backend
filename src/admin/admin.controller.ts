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
import { BlogComment } from '../blog-comments/blog-comment.entity';
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
        @InjectRepository(BlogComment) private comments: Repository<BlogComment>,
        private readonly notifications: NotificationsService,
    ) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'Dashboard statistics' })
    async dashboard() {
        const [totalProjects, totalBlogs, totalInquiries, newInquiries, pendingFeedback, totalFeedback, pendingComments, totalComments] =
            await Promise.all([
                this.projects.count(),
                this.blogs.count(),
                this.inquiries.count(),
                this.inquiries.count({ where: { status: InquiryStatus.NEW } }),
                this.feedback.count({ where: { isApproved: false } }),
                this.feedback.count(),
                this.comments.count({ where: { isApproved: false } }),
                this.comments.count(),
            ]);

        return {
            projects: { total: totalProjects },
            blogs: { total: totalBlogs },
            inquiries: { total: totalInquiries, new: newInquiries },
            feedback: { total: totalFeedback, pending: pendingFeedback },
            comments: { total: totalComments, pending: pendingComments },
        };
    }

    @Get('counts')
    @ApiOperation({ summary: 'Current unread/pending counts' })
    async counts() {
        const [newInquiries, pendingFeedback, pendingComments] = await Promise.all([
            this.inquiries.count({ where: { status: InquiryStatus.NEW } }),
            this.feedback.count({ where: { isApproved: false } }),
            this.comments.count({ where: { isApproved: false } }),
        ]);
        return {
            inquiries: { new: newInquiries },
            feedback: { pending: pendingFeedback },
            comments: { pending: pendingComments },
        };
    }

    @Sse('stream')
    @ApiOperation({ summary: 'Real-time admin event stream (SSE)' })
    stream(): Observable<MessageEvent> {
        return this.notifications.getStream().pipe(
            map(event => ({ data: event }) as MessageEvent),
        );
    }
}
