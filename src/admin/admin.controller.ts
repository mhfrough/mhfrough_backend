import { Controller, Get, Post, Body, UseGuards, Sse, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';
import { SendPushNotificationDto } from '../fcm/dto/fcm.dto';

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
        private readonly fcm: FcmService,
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

    @Post('push/send')
    @ApiOperation({ summary: 'Send a manual push notification to all subscribers' })
    async sendPush(@Body() dto: SendPushNotificationDto) {
        await this.fcm.sendPush({
            title: dto.title,
            body: dto.body,
            url: dto.url,
            source: PushNotifSource.ADMIN,
        });
        return { message: 'Push notification queued' };
    }

    @Get('push/logs')
    @ApiOperation({ summary: 'Get push notification logs' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getLogs(@Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number) {
        return this.fcm.getLogs(limit);
    }
}
