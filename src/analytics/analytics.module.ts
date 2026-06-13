import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/**
 * Read-only aggregation endpoint for the admin Analytics tab. Relies on the
 * global TypeORM DataSource (injected) — no per-entity registration needed.
 */
@Module({
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
})
export class AnalyticsModule { }
