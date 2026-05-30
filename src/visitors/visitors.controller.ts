import {
    Controller, Post, Get, Body, Query, UseGuards, Req,
    ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { PingVisitorDto } from './dto/ping-visitor.dto';
import { LeavePageDto } from './dto/leave-page.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Visitors')
@Controller('visitors')
export class VisitorsController {
    constructor(private readonly service: VisitorsService) { }

    /** Called by the public site on every page load */
    @Post('ping')
    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Track a page view / start/resume a visitor session' })
    ping(@Body() dto: PingVisitorDto, @Req() req: Request) {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined;
        const ip = forwarded?.split(',')[0]?.trim() ?? req.ip ?? '0.0.0.0';
        const ua = (req.headers['user-agent'] ?? '').slice(0, 512);
        return this.service.ping(dto, ip, ua);
    }

    /** Called by the public site via sendBeacon on page leave */
    @Post('leave')
    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Record time-on-page and update session duration' })
    leave(@Body() dto: LeavePageDto) {
        return this.service.leavePage(dto);
    }

    // ── Admin-only endpoints ──────────────────────────────────────────────────

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin: Paginated visitor sessions' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    list(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
        @Query('search') search?: string,
    ) {
        return this.service.findAll(page, Math.min(limit, 100), search);
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin: Visitor analytics summary' })
    stats() {
        return this.service.getStats();
    }
}
