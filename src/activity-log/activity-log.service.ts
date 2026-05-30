import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
import { EventsGateway } from '../events/events.gateway';

export interface LogPayload {
    action: string;
    resource: string;
    resourceId?: string;
    resourceTitle?: string;
    description: string;
    status?: 'success' | 'error';
    errorMessage?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class ActivityLogService {
    private readonly logger = new Logger(ActivityLogService.name);

    constructor(
        @InjectRepository(ActivityLog)
        private readonly repo: Repository<ActivityLog>,
        private readonly events: EventsGateway,
    ) { }

    async log(payload: LogPayload): Promise<void> {
        try {
            const entry = await this.repo.save(
                this.repo.create({ ...payload, status: payload.status ?? 'success' }),
            );
            this.events.emitToAdmin('activity:log_created', entry);
        } catch (err) {
            this.logger.error('Failed to write activity log', err);
        }
    }

    findAll(limit = 200): Promise<ActivityLog[]> {
        return this.repo.find({ order: { createdAt: 'DESC' }, take: limit });
    }

    async remove(id: string): Promise<void> {
        await this.repo.delete(id);
    }

    async clear(): Promise<void> {
        await this.repo.clear();
    }
}
