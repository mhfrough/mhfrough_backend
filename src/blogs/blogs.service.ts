import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './blog.entity';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class BlogsService {
    constructor(
        @InjectRepository(Blog) private readonly repo: Repository<Blog>,
        private readonly activityLog: ActivityLogService,
    ) { }

    findAll(publishedOnly = true): Promise<Blog[]> {
        const where = publishedOnly ? { isPublished: true } : {};
        return this.repo.find({ where, order: { publishedAt: 'DESC', createdAt: 'DESC' } });
    }

    async findBySlug(slug: string): Promise<Blog> {
        const blog = await this.repo.findOne({ where: { slug } });
        if (!blog) throw new NotFoundException('Blog post not found');
        return blog;
    }

    async findOne(id: string): Promise<Blog> {
        const blog = await this.repo.findOne({ where: { id } });
        if (!blog) throw new NotFoundException('Blog post not found');
        return blog;
    }

    create(dto: CreateBlogDto): Promise<Blog> {
        const blog = this.repo.create(dto);
        if (dto.isPublished && !blog.publishedAt) blog.publishedAt = new Date();
        const saved = this.repo.save(blog);
        saved.then(b => this.activityLog.log({
            action: 'blog:create',
            resource: 'blog',
            resourceId: b.id,
            resourceTitle: b.title,
            description: b.title,
        }));
        return saved;
    }

    async update(id: string, dto: UpdateBlogDto): Promise<Blog> {
        const blog = await this.findOne(id);
        const wasPublished = blog.isPublished;
        if (dto.isPublished && !blog.publishedAt) blog.publishedAt = new Date();
        Object.assign(blog, dto);
        const saved = await this.repo.save(blog);
        const action = dto.isPublished && !wasPublished ? 'blog:publish' : 'blog:update';
        const desc = saved.title;
        this.activityLog.log({ action, resource: 'blog', resourceId: saved.id, resourceTitle: saved.title, description: desc });
        return saved;
    }

    async unpublish(id: string, adminNote?: string): Promise<Blog> {
        const blog = await this.findOne(id);
        blog.isPublished = false;
        if (adminNote !== undefined) blog.adminNote = adminNote;
        const saved = await this.repo.save(blog);
        this.activityLog.log({
            action: 'blog:unpublish',
            resource: 'blog',
            resourceId: saved.id,
            resourceTitle: saved.title,
            description: saved.title,
        });
        return saved;
    }

    async remove(id: string): Promise<void> {
        const blog = await this.findOne(id);
        const title = blog.title;
        await this.repo.remove(blog);
        this.activityLog.log({
            action: 'blog:delete',
            resource: 'blog',
            resourceId: id,
            resourceTitle: title,
            description: title,
        });
    }
}
