import {
    Controller, Get, Delete, Post, Body, Param, Query,
    UseGuards, HttpCode, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityLogService } from './activity-log.service';
import { CreateClientErrorDto } from './dto/create-client-error.dto';
import { CreatePageNotFoundDto } from './dto/create-page-not-found.dto';

@ApiTags('Activity Logs')
@Controller('admin/activity-logs')
export class ActivityLogController {
    constructor(private readonly service: ActivityLogService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get activity logs' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(
        @Query('limit', new DefaultValuePipe(300), ParseIntPipe) limit: number,
    ) {
        return this.service.findAll(limit);
    }

    @Delete('all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({ summary: '[Admin] Clear all activity logs' })
    clearAll() {
        return this.service.clear();
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({ summary: '[Admin] Delete a single activity log entry' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }

    @Post('client-error')
    @HttpCode(204)
    @Throttle({ default: { ttl: 60000, limit: 15 } })
    @ApiOperation({ summary: 'Report a client-side error' })
    logClientError(@Body() dto: CreateClientErrorDto) {
        return this.service.log({
            action: 'error:client',
            resource: 'client',
            description: dto.message,
            status: 'error',
            errorMessage: dto.stack,
            metadata: { url: dto.url, context: dto.context, statusCode: dto.statusCode },
        });
    }

    @Post('page-not-found')
    @HttpCode(204)
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @ApiOperation({ summary: 'Report a 404 page visit' })
    logPageNotFound(@Body() dto: CreatePageNotFoundDto) {
        return this.service.log({
            action: 'nav:404',
            resource: 'nav',
            description: dto.url?.slice(0, 200) ?? '/',
            status: 'error',
        });
    }
}
