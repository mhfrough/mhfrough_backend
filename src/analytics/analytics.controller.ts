import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Admin Analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private readonly analytics: AnalyticsService) { }

    @Get()
    @ApiOperation({ summary: 'Time-series + distribution analytics for the admin Analytics tab' })
    @ApiQuery({ name: 'days', required: false, type: Number, description: 'Window size in days (7–365, default 30)' })
    overview(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
        const clamped = Math.min(Math.max(days, 7), 365);
        return this.analytics.overview(clamped);
    }
}
