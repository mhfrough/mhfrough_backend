import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DailyPoint {
    day: string; // YYYY-MM-DD
    count: number;
}

export interface DailyAmount {
    day: string;
    amount: number;
}

/**
 * Read-only aggregation for the admin Analytics tab. Uses parameterised raw SQL
 * (table names are fixed literals, never user input) so it stays simple and fast
 * regardless of how many rows exist.
 */
@Injectable()
export class AnalyticsService {
    constructor(@InjectDataSource() private readonly ds: DataSource) { }

    async overview(days: number) {
        const from = this.startDate(days);

        const [
            inquiries, leads, feedback, comments, revenue,
            leadsByStatus, feedbackByRating, inquiriesByStatus,
            totals,
        ] = await Promise.all([
            this.dailyCounts('inquiries', from),
            this.dailyCounts('leads', from),
            this.dailyCounts('feedback', from),
            this.dailyCounts('blog_comments', from),
            this.dailyRevenue(from),
            this.countByColumn('leads', 'status'),
            this.countByColumn('feedback', 'rating'),
            this.countByColumn('inquiries', 'status'),
            this.totals(),
        ]);

        return {
            range: { days, from: from.toISOString(), to: new Date().toISOString() },
            series: {
                inquiries: this.fill(inquiries, days),
                leads: this.fill(leads, days),
                feedback: this.fill(feedback, days),
                comments: this.fill(comments, days),
                revenue: this.fillAmount(revenue, days),
            },
            leadsByStatus,
            feedbackByRating,
            inquiriesByStatus,
            totals,
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private startDate(days: number): Date {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        d.setUTCDate(d.getUTCDate() - (days - 1));
        return d;
    }

    private async dailyCounts(table: string, from: Date): Promise<DailyPoint[]> {
        const rows = await this.ds.query(
            `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
             FROM "${table}"
             WHERE "createdAt" >= $1
             GROUP BY 1 ORDER BY 1`,
            [from],
        );
        return rows.map((r: any) => ({ day: r.day, count: Number(r.count) }));
    }

    private async dailyRevenue(from: Date): Promise<DailyAmount[]> {
        const rows = await this.ds.query(
            `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COALESCE(SUM("total"), 0)::float AS amount
             FROM "invoices"
             WHERE "status" = 'paid' AND "createdAt" >= $1
             GROUP BY 1 ORDER BY 1`,
            [from],
        );
        return rows.map((r: any) => ({ day: r.day, amount: Number(r.amount) }));
    }

    private async countByColumn(table: string, column: string): Promise<Record<string, number>> {
        const rows = await this.ds.query(
            `SELECT "${column}"::text AS key, COUNT(*)::int AS count FROM "${table}" GROUP BY 1`,
        );
        const out: Record<string, number> = {};
        for (const r of rows) out[r.key] = Number(r.count);
        return out;
    }

    private async totals() {
        const one = async (sql: string): Promise<number> => {
            const r = await this.ds.query(sql);
            return Number(r[0]?.n ?? 0);
        };
        const [projects, blogs, inquiries, feedback, comments, leads, paidRevenue] = await Promise.all([
            one(`SELECT COUNT(*)::int AS n FROM "projects"`),
            one(`SELECT COUNT(*)::int AS n FROM "blogs"`),
            one(`SELECT COUNT(*)::int AS n FROM "inquiries"`),
            one(`SELECT COUNT(*)::int AS n FROM "feedback"`),
            one(`SELECT COUNT(*)::int AS n FROM "blog_comments"`),
            one(`SELECT COUNT(*)::int AS n FROM "leads"`),
            one(`SELECT COALESCE(SUM("total"), 0)::float AS n FROM "invoices" WHERE "status" = 'paid'`),
        ]);
        return { projects, blogs, inquiries, feedback, comments, leads, paidRevenue };
    }

    /** Pads a sparse daily series into a continuous array of `days` points (0-filled). */
    private fill(points: DailyPoint[], days: number): DailyPoint[] {
        const map = new Map(points.map(p => [p.day, p.count]));
        return this.dayKeys(days).map(day => ({ day, count: map.get(day) ?? 0 }));
    }

    private fillAmount(points: DailyAmount[], days: number): DailyAmount[] {
        const map = new Map(points.map(p => [p.day, p.amount]));
        return this.dayKeys(days).map(day => ({ day, amount: map.get(day) ?? 0 }));
    }

    private dayKeys(days: number): string[] {
        const keys: string[] = [];
        const start = this.startDate(days);
        for (let i = 0; i < days; i++) {
            const d = new Date(start);
            d.setUTCDate(start.getUTCDate() + i);
            keys.push(d.toISOString().slice(0, 10));
        }
        return keys;
    }
}
