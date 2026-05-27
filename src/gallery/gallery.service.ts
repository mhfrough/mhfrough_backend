import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalleryItem } from './gallery-item.entity';
import { CreateGalleryItemDto, UpdateGalleryItemDto } from './dto/gallery-item.dto';

@Injectable()
export class GalleryService {
    constructor(
        @InjectRepository(GalleryItem) private readonly repo: Repository<GalleryItem>,
    ) { }

    findAll(publishedOnly = true): Promise<GalleryItem[]> {
        const where = publishedOnly ? { isPublished: true } : {};
        return this.repo.find({ where, order: { sortOrder: 'ASC', createdAt: 'DESC' } });
    }

    async findOne(id: string): Promise<GalleryItem> {
        const item = await this.repo.findOne({ where: { id } });
        if (!item) throw new NotFoundException('Gallery item not found');
        return item;
    }

    create(dto: CreateGalleryItemDto): Promise<GalleryItem> {
        return this.repo.save(this.repo.create(dto));
    }

    async update(id: string, dto: UpdateGalleryItemDto): Promise<GalleryItem> {
        await this.findOne(id);
        await this.repo.update(id, dto as any);
        return this.findOne(id);
    }

    async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
        await Promise.all(items.map(({ id, sortOrder }) => this.repo.update(id, { sortOrder })));
    }

    async remove(id: string): Promise<void> {
        await this.findOne(id);
        await this.repo.delete(id);
    }
}
