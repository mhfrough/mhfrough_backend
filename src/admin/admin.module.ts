import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { Project } from '../projects/project.entity';
import { Blog } from '../blogs/blog.entity';
import { Inquiry } from '../inquiries/inquiry.entity';
import { Feedback } from '../feedback/feedback.entity';
import { BlogComment } from '../blog-comments/blog-comment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { FcmModule } from '../fcm/fcm.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Project, Blog, Inquiry, Feedback, BlogComment]),
        NotificationsModule,
        FcmModule,
    ],
    controllers: [AdminController],
})
export class AdminModule { }
