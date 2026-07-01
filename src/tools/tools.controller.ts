import {
    Controller, Post, Get, Delete, Body, Query, Req, UseGuards,
    ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { MinifyDto } from './dto/minify.dto';
import { TransformCssDto } from './dto/transform-css.dto';
import { ReportUsageDto } from './dto/report-usage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Tools')
@Controller('tools')
export class ToolsController {
    constructor(private readonly service: ToolsService) { }

    private clientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined;
        return forwarded?.split(',')[0]?.trim() ?? req.ip ?? '0.0.0.0';
    }

    private userAgent(req: Request): string {
        return (req.headers['user-agent'] ?? '').slice(0, 512);
    }

    @Post('minify')
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: 'Minify HTML / CSS / JS source' })
    minify(@Body() dto: MinifyDto, @Req() req: Request) {
        return this.service.minify(dto, this.clientIp(req), this.userAgent(req));
    }

    @Post('transform-css')
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: 'Convert / format between CSS and SCSS' })
    transformCss(@Body() dto: TransformCssDto, @Req() req: Request) {
        return this.service.transformCss(dto, this.clientIp(req), this.userAgent(req));
    }

    @Post('usage')
    @Throttle({ default: { limit: 120, ttl: 60000 } })
    @ApiOperation({ summary: 'Report client-side tool usage' })
    usage(@Body() dto: ReportUsageDto, @Req() req: Request) {
        return this.service.logUsage(dto, this.clientIp(req), this.userAgent(req));
    }

    // ── Admin-only endpoints ──────────────────────────────────────────────────

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin: Paginated tool usage logs' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    list(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    ) {
        return this.service.findAll(page, Math.min(limit, 100));
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin: Tool usage summary' })
    stats() {
        return this.service.getStats();
    }

    @Delete()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Admin: Delete all tool usage logs' })
    clearAll() {
        return this.service.clearAll();
    }
}
