import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project) private readonly repo: Repository<Project>,
        private readonly events: EventsGateway,
        private readonly notifications: NotificationsService,
        private readonly fcm: FcmService,
    ) { }

    findAll(publishedOnly = true): Promise<Project[]> {
        const where = publishedOnly ? { isPublished: true } : {};
        return this.repo.find({ where, order: { sortOrder: 'ASC', createdAt: 'DESC' } });
    }

    async findOne(id: string): Promise<Project> {
        const p = await this.repo.findOne({ where: { id } });
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
        });
        return saved;
    }

    async update(id: string, dto: UpdateProjectDto): Promise<Project> {
        const project = await this.findOne(id);
        Object.assign(project, dto);
        const saved = await this.repo.save(project);
        this.events.emitToAll('project:updated', saved);
        return saved;
    }

    async unpublish(id: string, adminNote?: string): Promise<Project> {
        const project = await this.findOne(id);
        project.isPublished = false;
        if (adminNote !== undefined) project.adminNote = adminNote;
        const saved = await this.repo.save(project);
        this.events.emitToAll('project:unpublished', { id: saved.id });
        return saved;
    }

    async remove(id: string): Promise<void> {
        const project = await this.findOne(id);
        await this.repo.remove(project);
        this.events.emitToAll('project:deleted', { id });
    }
}
