import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogComment } from './blog-comment.entity';
import { CreateBlogCommentDto } from './dto/blog-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class BlogCommentsService {
    constructor(
        @InjectRepository(BlogComment) private readonly repo: Repository<BlogComment>,
        private readonly notifications: NotificationsService,
        private readonly fcm: FcmService,
        private readonly events: EventsGateway,
    ) { }

    async submit(blogId: string, dto: CreateBlogCommentDto): Promise<BlogComment> {
        const comment = this.repo.create({ ...dto, blogId, isApproved: false });
        const saved = await this.repo.save(comment);
        this.notifications.emit('new_comment');
        this.events.emitToAdmin('comment:new', saved);
        this.fcm.sendPush({
            title: '💬 New Blog Comment',
            body: `${dto.authorName} commented: "${dto.content.slice(0, 80)}"`,
            url: '/admin/comments',
            source: PushNotifSource.COMMENT,
        });
        return saved;
    }

    findApproved(blogId: string): Promise<BlogComment[]> {
        return this.repo.find({
            where: { blogId, isApproved: true },
            order: { createdAt: 'ASC' },
        });
    }

    countApproved(blogId: string): Promise<number> {
        return this.repo.count({ where: { blogId, isApproved: true } });
    }

    findPending(): Promise<BlogComment[]> {
        return this.repo.find({ where: { isApproved: false }, order: { createdAt: 'DESC' } });
    }

    countPending(): Promise<number> {
        return this.repo.count({ where: { isApproved: false } });
    }

    findAll(): Promise<BlogComment[]> {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }

    async approve(id: string): Promise<BlogComment> {
        const comment = await this.repo.findOneBy({ id });
        if (!comment) throw new NotFoundException('Comment not found');
        comment.isApproved = true;
        const saved = await this.repo.save(comment);
        this.notifications.emit('comment_updated');
        // emit to all: admin list updates + public blog page shows the new comment
        this.events.emitToAll('comment:approved', saved);
        return saved;
    }

    async unapprove(id: string, adminNote?: string): Promise<BlogComment> {
        const comment = await this.repo.findOneBy({ id });
        if (!comment) throw new NotFoundException('Comment not found');
        comment.isApproved = false;
        if (adminNote !== undefined) comment.adminNote = adminNote;
        const saved = await this.repo.save(comment);
        this.notifications.emit('comment_updated');
        // send minimal payload to public (enough to remove from view), full to admin
        this.events.emitToAll('comment:unapproved', { id: saved.id, blogId: saved.blogId });
        return saved;
    }

    async remove(id: string): Promise<void> {
        const comment = await this.repo.findOneBy({ id });
        const blogId = comment?.blogId;
        await this.repo.delete(id);
        this.notifications.emit('comment_updated');
        this.events.emitToAll('comment:deleted', { id, blogId });
    }
}
