import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './blog.entity';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';

@Injectable()
export class BlogsService {
    constructor(@InjectRepository(Blog) private readonly repo: Repository<Blog>) { }

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
        return this.repo.save(blog);
    }

    async update(id: string, dto: UpdateBlogDto): Promise<Blog> {
        const blog = await this.findOne(id);
        if (dto.isPublished && !blog.publishedAt) blog.publishedAt = new Date();
        Object.assign(blog, dto);
        return this.repo.save(blog);
    }

    async unpublish(id: string, adminNote?: string): Promise<Blog> {
        const blog = await this.findOne(id);
        blog.isPublished = false;
        if (adminNote !== undefined) blog.adminNote = adminNote;
        return this.repo.save(blog);
    }

    async remove(id: string): Promise<void> {
        const blog = await this.findOne(id);
        await this.repo.remove(blog);
    }
}
