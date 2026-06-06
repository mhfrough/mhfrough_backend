import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project) private readonly repo: Repository<Project>,
        private readonly events: EventsGateway,
        private readonly notifications: NotificationsService,
        private readonly fcm: FcmService,
        private readonly activityLog: ActivityLogService,
        private readonly storage: SupabaseStorageService,
    ) { }

    findAll(publishedOnly = true): Promise<Project[]> {
        const where = publishedOnly ? { isPublished: true } : {};
        return this.repo.find({ where, order: { sortOrder: 'ASC', createdAt: 'DESC' } });
    }

    async findPublicPaginated(page: number, limit: number, q?: string, tag?: string) {
        const qb = this.repo.createQueryBuilder('project')
            .where('project.isPublished = :pub', { pub: true });

        if (q) {
            qb.andWhere(
                '(project.title ILIKE :q OR project.description ILIKE :q OR project.techStack ILIKE :q)',
                { q: `%${q}%` },
            );
        }

        if (tag && tag !== 'all') {
            qb.andWhere(
                '(project.tags = :t OR project.tags LIKE :ts OR project.tags LIKE :te OR project.tags LIKE :tm)',
                { t: tag, ts: `${tag},%`, te: `%,${tag}`, tm: `%,${tag},%` },
            );
        }

        qb.orderBy('project.sortOrder', 'ASC')
            .addOrderBy('project.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }

    findFeatured(): Promise<Project[]> {
        return this.repo.find({ where: { isPublished: true, featured: true }, order: { sortOrder: 'ASC', createdAt: 'DESC' } });
    }

    async findDistinctTags(): Promise<string[]> {
        const rows = await this.repo.createQueryBuilder('project')
            .select('project.tags', 'tags')
            .where("project.tags IS NOT NULL AND project.tags != ''")
            .getRawMany();
        const all: string[] = [];
        for (const row of rows) {
            if (row.tags) {
                all.push(...String(row.tags).split(',').map((t: string) => t.trim()).filter(Boolean));
            }
        }
        return [...new Set(all)].sort();
    }

    async findOne(id: string): Promise<Project> {
        const p = await this.repo.findOne({ where: { id } });
        if (!p) throw new NotFoundException('Project not found');
        return p;
    }

    async findBySlug(slug: string): Promise<Project> {
        const p = await this.repo.findOne({ where: { slug, isPublished: true } });
        if (!p) throw new NotFoundException('Project not found');
        return p;
    }

    create(dto: CreateProjectDto): Promise<Project> {
        const project = this.repo.create(dto);
        const saved = this.repo.save(project);
        saved.then(p => {
            this.events.emitToAll('project:created', p);
            this.fcm.sendPush({
                title: '🚀 New Project Published',
                body: `"${p.title}" is now live`,
                url: '/',
                source: PushNotifSource.INQUIRY,
            });
            this.activityLog.log({
                action: 'project:create',
                resource: 'project',
                resourceId: p.id,
                resourceTitle: p.title,
                description: p.title,
            });
        });
        return saved;
    }

    async update(id: string, dto: UpdateProjectDto): Promise<Project> {
        const project = await this.findOne(id);
        if (dto.thumbnail && dto.thumbnail !== project.thumbnail) {
            await this.storage.deleteByUrl(project.thumbnail);
            this.activityLog.log({
                action: 'upload:file_replaced',
                resource: 'project',
                resourceId: id,
                resourceTitle: project.title,
                description: `Thumbnail replaced for project: "${project.title}"`,
                status: 'success',
            });
        }
        Object.assign(project, dto);
        const saved = await this.repo.save(project);
        this.events.emitToAll('project:updated', saved);
        this.activityLog.log({
            action: 'project:update',
            resource: 'project',
            resourceId: saved.id,
            resourceTitle: saved.title,
            description: saved.title,
        });
        return saved;
    }

    async patchFeatured(id: string, featured: boolean): Promise<Project> {
        const project = await this.findOne(id);
        project.featured = featured;
        const saved = await this.repo.save(project);
        this.events.emitToAll('project:updated', saved);
        this.activityLog.log({
            action: 'project:update',
            resource: 'project',
            resourceId: saved.id,
            resourceTitle: saved.title,
            description: `featured → ${featured}`,
        });
        return saved;
    }

    async unpublish(id: string, adminNote?: string): Promise<Project> {
        const project = await this.findOne(id);
        project.isPublished = false;
        if (adminNote !== undefined) project.adminNote = adminNote;
        const saved = await this.repo.save(project);
        this.events.emitToAll('project:unpublished', { id: saved.id });
        this.activityLog.log({
            action: 'project:unpublish',
            resource: 'project',
            resourceId: saved.id,
            resourceTitle: saved.title,
            description: saved.title,
        });
        return saved;
    }

    async remove(id: string): Promise<void> {
        const project = await this.findOne(id);
        const title = project.title;
        if (project.thumbnail) {
            await this.storage.deleteByUrl(project.thumbnail);
        }
        await this.repo.remove(project);
        this.events.emitToAll('project:deleted', { id });
        this.activityLog.log({
            action: 'project:delete',
            resource: 'project',
            resourceId: id,
            resourceTitle: title,
            description: `Project deleted: "${title}"${project.thumbnail ? ' — thumbnail removed from storage' : ''}`,
        });
    }
}
