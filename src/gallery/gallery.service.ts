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

    async findPublicPaginated(
        page: number, limit: number, q?: string, category?: string,
    ): Promise<{ data: GalleryItem[]; total: number; page: number; limit: number; totalPages: number }> {
        const qb = this.repo.createQueryBuilder('g')
            .where('g.isPublished = :pub', { pub: true });
        if (q) {
            qb.andWhere(
                '(g.title ILIKE :q OR g.caption ILIKE :q OR g.altText ILIKE :q)',
                { q: `%${q}%` },
            );
        }
        if (category && category !== 'all') {
            qb.andWhere('g.category = :category', { category });
        }
        qb.orderBy('g.sortOrder', 'ASC')
            .addOrderBy('g.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findDistinctCategories(): Promise<string[]> {
        const rows = await this.repo.createQueryBuilder('g')
            .select('DISTINCT g.category', 'category')
            .where("g.isPublished = :pub AND g.category IS NOT NULL AND g.category != ''")
            .setParameter('pub', true)
            .getRawMany();
        return rows.map((r: any) => r.category).filter(Boolean).sort();
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
