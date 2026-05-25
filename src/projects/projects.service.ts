import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
    constructor(@InjectRepository(Project) private readonly repo: Repository<Project>) { }

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
        return this.repo.save(project);
    }

    async update(id: string, dto: UpdateProjectDto): Promise<Project> {
        const project = await this.findOne(id);
        Object.assign(project, dto);
        return this.repo.save(project);
    }

    async unpublish(id: string, adminNote?: string): Promise<Project> {
        const project = await this.findOne(id);
        project.isPublished = false;
        if (adminNote !== undefined) project.adminNote = adminNote;
        return this.repo.save(project);
    }

    async remove(id: string): Promise<void> {
        const project = await this.findOne(id);
        await this.repo.remove(project);
    }
}
