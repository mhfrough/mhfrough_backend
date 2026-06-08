import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalleryItem } from './gallery-item.entity';
import { CreateGalleryItemDto, UpdateGalleryItemDto } from './dto/gallery-item.dto';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class GalleryService {
    constructor(
        @InjectRepository(GalleryItem) private readonly repo: Repository<GalleryItem>,
        private readonly storage: SupabaseStorageService,
        private readonly activityLog: ActivityLogService,
        private readonly events: EventsGateway,
    ) { }

    findAll(publishedOnly = true): Promise<GalleryItem[]> {
        const where = publishedOnly ? { isPublished: true } : {};
        return this.repo.find({ where, order: { createdAt: 'DESC' } });
    }

    async findPublicPaginated(
        page: number, limit: number, q?: string, category?: string, tag?: string,
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
        if (tag && tag !== 'all') {
            qb.andWhere(
                '(g.tags = :t OR g.tags LIKE :ts OR g.tags LIKE :te OR g.tags LIKE :tm)',
                { t: tag, ts: `${tag},%`, te: `%,${tag}`, tm: `%,${tag},%` },
            );
        }
        qb.orderBy('g.createdAt', 'DESC')
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

    async findDistinctTags(): Promise<string[]> {
        const rows = await this.repo.createQueryBuilder('g')
            .select('g.tags', 'tags')
            .where("g.tags IS NOT NULL AND g.tags != ''")
            .getRawMany();
        const all: string[] = [];
        for (const row of rows) {
            if (row.tags) {
                all.push(...String(row.tags).split(',').map((t: string) => t.trim()).filter(Boolean));
            }
        }
        return [...new Set(all)].sort();
    }

    async findOne(id: string): Promise<GalleryItem> {
        const item = await this.repo.findOne({ where: { id } });
        if (!item) throw new NotFoundException('Gallery item not found');
        return item;
    }

    async create(dto: CreateGalleryItemDto): Promise<GalleryItem> {
        const item = await this.repo.save(this.repo.create(dto));
        this.activityLog.log({
            action: 'gallery:created',
            resource: 'gallery',
            resourceId: item.id,
            resourceTitle: item.title ?? item.id,
            description: `Gallery item created: "${item.title ?? item.id}" (${item.mediaType})`,
            status: 'success',
        });
        this.events.emitToAdmin('gallery:created', item);
        if (item.isPublished) this.events.emitToAll('gallery:published', item);
        return item;
    }

    async update(id: string, dto: UpdateGalleryItemDto): Promise<GalleryItem> {
        const existing = await this.findOne(id);
        const mediaReplaced = dto.mediaUrl && dto.mediaUrl !== existing.mediaUrl;
        if (mediaReplaced) {
            await this.storage.deleteByUrl(existing.mediaUrl);
            this.activityLog.log({
                action: 'upload:file_replaced',
                resource: 'gallery',
                resourceId: id,
                resourceTitle: existing.title ?? id,
                description: `Gallery media replaced for "${existing.title ?? id}"`,
                status: 'success',
            });
        }
        await this.repo.update(id, dto as any);
        const updated = await this.findOne(id);
        this.activityLog.log({
            action: 'gallery:updated',
            resource: 'gallery',
            resourceId: id,
            resourceTitle: updated.title ?? id,
            description: `Gallery item updated: "${updated.title ?? id}"`,
            status: 'success',
        });
        this.events.emitToAdmin('gallery:updated', updated);
        if (updated.isPublished) {
            this.events.emitToAll('gallery:updated', updated);
        } else if (existing.isPublished && !updated.isPublished) {
            this.events.emitToAll('gallery:unpublished', { id });
        }
        return updated;
    }

    async remove(id: string): Promise<void> {
        const item = await this.findOne(id);
        await this.storage.deleteByUrl(item.mediaUrl);
        await this.repo.delete(id);
        this.activityLog.log({
            action: 'gallery:deleted',
            resource: 'gallery',
            resourceId: id,
            resourceTitle: item.title ?? id,
            description: `Gallery item deleted: "${item.title ?? id}" — media file removed from storage`,
            status: 'success',
        });
        this.events.emitToAdmin('gallery:deleted', { id });
        if (item.isPublished) this.events.emitToAll('gallery:deleted', { id });
    }
}
