import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

import { Project } from '../projects/project.entity';
import { Blog } from '../blogs/blog.entity';
import { BlogComment } from '../blog-comments/blog-comment.entity';
import { Inquiry } from '../inquiries/inquiry.entity';
import { Feedback } from '../feedback/feedback.entity';
import { Lead } from '../leads/lead.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Appointment } from '../appointments/appointment.entity';
import { GalleryItem } from '../gallery/gallery-item.entity';
import { VisitorSession } from '../visitors/visitor-session.entity';
import { ChatSession } from '../chat/chat-session.entity';
import { PushNotificationLog } from '../fcm/push-notification-log.entity';
import { ActivityLog } from '../activity-log/activity-log.entity';

interface DatasetDef {
    label: string;
    entity: EntityTarget<ObjectLiteral>;
    /** Cascade-deleted children, surfaced to the UI so the operator knows. */
    note?: string;
}

/** Phrase the operator must type verbatim to confirm a destructive wipe. */
export const CONFIRM_PHRASE = 'DELETE';

/**
 * Hard allowlist of content datasets that can be exported or cleared. The admin
 * account, settings, sessions, and site config are intentionally NOT here — they
 * can never be wiped through this endpoint. FK relations are all ON DELETE
 * CASCADE (or SET NULL for invoices→leads), so a single DELETE per primary table
 * is safe and predictable.
 */
const DATASETS: Record<string, DatasetDef> = {
    projects: { label: 'Projects', entity: Project },
    blogs: { label: 'Blog posts', entity: Blog, note: 'also clears their comments' },
    comments: { label: 'Blog comments', entity: BlogComment },
    inquiries: { label: 'Inquiries', entity: Inquiry },
    feedback: { label: 'Feedback / reviews', entity: Feedback },
    leads: { label: 'Leads', entity: Lead, note: 'unlinks invoices, keeps the invoices' },
    invoices: { label: 'Invoices', entity: Invoice, note: 'also clears their line items' },
    appointments: { label: 'Reminders / appointments', entity: Appointment },
    gallery: { label: 'Gallery items', entity: GalleryItem },
    visitors: { label: 'Visitor analytics', entity: VisitorSession, note: 'also clears page views & events' },
    chat: { label: 'Live chat history', entity: ChatSession, note: 'also clears chat messages' },
    notificationLogs: { label: 'Push notification logs', entity: PushNotificationLog },
    activityLogs: { label: 'Activity logs', entity: ActivityLog },
};

@Injectable()
export class AdminDataService {
    constructor(
        @InjectDataSource() private readonly ds: DataSource,
        private readonly users: UsersService,
        private readonly activityLog: ActivityLogService,
    ) { }

    /** Dataset catalogue with live row counts for the Danger Zone UI. */
    async listDatasets() {
        const out = [];
        for (const [key, def] of Object.entries(DATASETS)) {
            const repo = this.ds.getRepository(def.entity);
            out.push({ key, label: def.label, note: def.note ?? null, count: await repo.count() });
        }
        return out;
    }

    /** Full JSON snapshot of every content dataset (downloaded by the client). */
    async export() {
        const data: Record<string, unknown[]> = {};
        for (const [key, def] of Object.entries(DATASETS)) {
            data[key] = await this.ds.getRepository(def.entity).find();
        }
        return {
            exportedAt: new Date().toISOString(),
            version: 1,
            counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
            data,
        };
    }

    /** Irreversibly clears the selected datasets after re-verifying the admin password. */
    async wipe(userId: string, password: string, confirm: string, datasets: string[]) {
        const passwordOk = await this.users.verifyPassword(userId, password);
        if (!passwordOk) {
            await this.activityLog.log({
                action: 'data:wipe_denied',
                resource: 'database',
                description: 'Data wipe rejected — incorrect password',
                status: 'error',
            });
            throw new UnauthorizedException('Password is incorrect.');
        }

        if (confirm !== CONFIRM_PHRASE) {
            throw new BadRequestException(`Type "${CONFIRM_PHRASE}" exactly to confirm.`);
        }

        const keys = [...new Set(datasets)].filter(k => k in DATASETS);
        if (keys.length === 0) {
            throw new BadRequestException('No valid datasets selected.');
        }

        const cleared: Record<string, number> = {};
        await this.ds.transaction(async (manager) => {
            for (const key of keys) {
                const repo = manager.getRepository(DATASETS[key].entity);
                const table = repo.metadata.tableName;
                cleared[key] = await repo.count();
                // Table name comes from a fixed allowlist (never user input).
                await manager.query(`DELETE FROM "${table}"`);
            }
        });

        await this.activityLog.log({
            action: 'data:wipe',
            resource: 'database',
            description: `Cleared datasets: ${keys.join(', ')}`,
            status: 'success',
            metadata: cleared,
        });

        return { message: 'Selected data permanently cleared.', cleared };
    }
}
