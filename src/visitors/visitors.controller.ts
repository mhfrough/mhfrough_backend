import {
    Controller, Post, Get, Delete, Body, Query, Param, UseGuards, Req,
    ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { PingVisitorDto } from './dto/ping-visitor.dto';
import { LeavePageDto } from './dto/leave-page.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Visitors')
@Controller('visitors')
export class VisitorsController {
    constructor(private readonly service: VisitorsService) { }

    @Post('ping')
    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Track a page view / start/resume a visitor session' })
    ping(@Body() dto: PingVisitorDto, @Req() req: Request) {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined;
        const ip = forwarded?.split(',')[0]?.trim() ?? req.ip ?? '0.0.0.0';
        const ua = (req.headers['user-agent'] ?? '').slice(0, 512);
        return this.service.ping(dto, ip, ua);
    }

    @Post('leave')
    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Record time-on-page and update session duration' })
    leave(@Body() dto: LeavePageDto) {
        return this.service.leavePage(dto);
    }

    @Post('event')
    @Throttle({ default: { limit: 120, ttl: 60000 } })
    @ApiOperation({ summary: 'Track a named visitor action/event' })
    trackEvent(@Body() dto: TrackEventDto) {
        return this.service.trackEvent(dto);
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

    @Get(':sessionId/journey')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin: Full journey for a session (page views + events)' })
    journey(@Param('sessionId') sessionId: string) {
        return this.service.getJourney(sessionId);
    }

    @Get(':sessionId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin: Get a single visitor session' })
    findOne(@Param('sessionId') sessionId: string) {
        return this.service.findOne(sessionId);
    }

    @Delete()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Admin: Delete all visitor data' })
    clearAll() {
        return this.service.clearAll();
    }

    @Delete(':sessionId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Admin: Delete a single visitor session' })
    deleteSession(@Param('sessionId') sessionId: string) {
        return this.service.deleteSession(sessionId);
    }
}
