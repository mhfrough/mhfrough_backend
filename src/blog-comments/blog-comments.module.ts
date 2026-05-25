import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogComment } from './blog-comment.entity';
import { BlogCommentsService } from './blog-comments.service';
import { BlogCommentsController } from './blog-comments.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [TypeOrmModule.forFeature([BlogComment]), NotificationsModule],
    controllers: [BlogCommentsController],
    providers: [BlogCommentsService],
    exports: [BlogCommentsService],
})
export class BlogCommentsModule { }
