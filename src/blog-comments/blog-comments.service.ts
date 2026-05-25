import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogComment } from './blog-comment.entity';
import { CreateBlogCommentDto } from './dto/blog-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BlogCommentsService {
    constructor(
        @InjectRepository(BlogComment) private readonly repo: Repository<BlogComment>,
        private readonly notifications: NotificationsService,
    ) { }

    async submit(blogId: string, dto: CreateBlogCommentDto): Promise<BlogComment> {
        const comment = this.repo.create({ ...dto, blogId, isApproved: false });
        const saved = await this.repo.save(comment);
        this.notifications.emit('new_comment');
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
        return this.repo.save(comment);
    }

    async unapprove(id: string, adminNote?: string): Promise<BlogComment> {
        const comment = await this.repo.findOneBy({ id });
        if (!comment) throw new NotFoundException('Comment not found');
        comment.isApproved = false;
        if (adminNote !== undefined) comment.adminNote = adminNote;
        return this.repo.save(comment);
    }

    async remove(id: string): Promise<void> {
        await this.repo.delete(id);
    }
}
