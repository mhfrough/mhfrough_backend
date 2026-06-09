import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from './appointment.entity';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class AppointmentsService {
    constructor(
        @InjectRepository(Appointment)
        private readonly repo: Repository<Appointment>,
        private readonly activityLog: ActivityLogService,
        private readonly gateway: EventsGateway,
    ) {}

    findAll(): Promise<Appointment[]> {
        return this.repo.find({ order: { date: 'ASC', startTime: 'ASC' } });
    }

    findByMonth(year: number, month: number): Promise<Appointment[]> {
        const pad = (n: number) => String(n).padStart(2, '0');
        const from = `${year}-${pad(month)}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${year}-${pad(month)}-${pad(lastDay)}`;
        return this.repo.find({
            where: { date: Between(from, to) },
            order: { date: 'ASC', startTime: 'ASC' },
        });
    }

    findUpcoming(withinHours = 24): Promise<Appointment[]> {
        const now = new Date();
        const until = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
        const toDate = (d: Date) => d.toISOString().slice(0, 10);
        return this.repo.find({
            where: { date: Between(toDate(now), toDate(until)), status: 'confirmed' },
            order: { date: 'ASC', startTime: 'ASC' },
        });
    }

    async findOne(id: string): Promise<Appointment> {
        const appt = await this.repo.findOne({ where: { id } });
        if (!appt) throw new NotFoundException('Reminder not found');
        return appt;
    }

    async create(dto: CreateAppointmentDto): Promise<Appointment> {
        const appt = this.repo.create({
            ...dto,
            durationMinutes: dto.durationMinutes ?? 60,
            status: (dto.status as any) ?? 'pending',
        });
        const saved = await this.repo.save(appt);
        this.activityLog.log({
            action: 'appointment:create',
            resource: 'appointment',
            resourceId: saved.id,
            resourceTitle: saved.title,
            description: `${saved.title} · ${saved.date}`,
        });
        this.gateway.emitToAdmin('reminder:created', saved);
        return saved;
    }

    async update(id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
        const appt = await this.findOne(id);
        Object.assign(appt, dto);
        const saved = await this.repo.save(appt);
        this.activityLog.log({
            action: 'appointment:update',
            resource: 'appointment',
            resourceId: saved.id,
            resourceTitle: saved.title,
            description: `${saved.title} · ${saved.status}`,
        });
        this.gateway.emitToAdmin('reminder:updated', saved);
        return saved;
    }

    async remove(id: string): Promise<void> {
        const appt = await this.findOne(id);
        await this.repo.remove(appt);
        this.activityLog.log({
            action: 'appointment:delete',
            resource: 'appointment',
            resourceId: id,
            resourceTitle: appt.title,
            description: appt.title,
        });
        this.gateway.emitToAdmin('reminder:deleted', { id });
    }

    async markReminderSent(id: string): Promise<void> {
        await this.repo.update(id, { reminderSentAt: new Date() });
    }
}
