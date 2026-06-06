import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './blog.entity';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service';

@Injectable()
export class BlogsService {
    constructor(
        @InjectRepository(Blog) private readonly repo: Repository<Blog>,
        private readonly activityLog: ActivityLogService,
        private readonly storage: SupabaseStorageService,
    ) { }

    findAll(publishedOnly = true): Promise<Blog[]> {
        const where = publishedOnly ? { isPublished: true } : {};
        return this.repo.find({ where, order: { publishedAt: 'DESC', createdAt: 'DESC' } });
    }

    async findPublicPaginated(page: number, limit: number, q?: string, tag?: string) {
        const qb = this.repo.createQueryBuilder('blog')
            .where('blog.isPublished = :pub', { pub: true });

        if (q) {
            qb.andWhere(
                '(blog.title ILIKE :q OR blog.excerpt ILIKE :q OR blog.tags ILIKE :q)',
                { q: `%${q}%` },
            );
        }

        if (tag && tag !== 'all') {
            qb.andWhere(
                '(blog.tags = :t OR blog.tags LIKE :ts OR blog.tags LIKE :te OR blog.tags LIKE :tm)',
                { t: tag, ts: `${tag},%`, te: `%,${tag}`, tm: `%,${tag},%` },
            );
        }

        qb.orderBy('blog.publishedAt', 'DESC')
            .addOrderBy('blog.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }

    async findBySlug(slug: string): Promise<Blog> {
        const blog = await this.repo.findOne({ where: { slug } });
        if (!blog) throw new NotFoundException('Blog post not found');
        return blog;
    }

    async findDistinctTags(): Promise<string[]> {
        const rows = await this.repo.createQueryBuilder('blog')
            .select('blog.tags', 'tags')
            .where("blog.tags IS NOT NULL AND blog.tags != ''")
            .getRawMany();
        const all: string[] = [];
        for (const row of rows) {
            if (row.tags) {
                all.push(...String(row.tags).split(',').map((t: string) => t.trim()).filter(Boolean));
            }
        }
        return [...new Set(all)].sort();
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
        if (dto.coverImage && dto.coverImage !== blog.coverImage) {
            await this.storage.deleteByUrl(blog.coverImage);
            this.activityLog.log({
                action: 'upload:file_replaced',
                resource: 'blog',
                resourceId: id,
                resourceTitle: blog.title,
                description: `Cover image replaced for blog: "${blog.title}"`,
                status: 'success',
            });
        }
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
        if (blog.coverImage) {
            await this.storage.deleteByUrl(blog.coverImage);
        }
        this.activityLog.log({
            action: 'blog:delete',
            resource: 'blog',
            resourceId: id,
            resourceTitle: title,
            description: `Blog deleted: "${title}"${blog.coverImage ? ' — cover image removed from storage' : ''}`,
        });
    }
}
