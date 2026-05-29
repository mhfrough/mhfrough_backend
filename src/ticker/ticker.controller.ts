import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Query, UseGuards,
    ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TickerService } from './ticker.service';
import { CreateTickerMessageDto, UpdateTickerMessageDto } from './dto/ticker-message.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('Ticker')
@Controller('ticker')
export class TickerController {
    constructor(
        private readonly service: TickerService,
        private readonly activityLog: ActivityLogService,
    ) { }

    /** Public: active tickers shown on the website */
    @Get()
    @ApiOperation({ summary: 'Get all published ticker messages' })
    findPublished() {
        return this.service.findPublished();
    }

    /** Admin: paginated + search */
    @Get('admin')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get all ticker messages with pagination & search' })
    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('q') q?: string,
    ) {
        return this.service.findAllAdmin(page, limit, q);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Create a ticker message' })
    async create(@Body() dto: CreateTickerMessageDto) {
        const result = await this.service.create(dto);
        this.activityLog.log({
            action: 'ticker:created',
            resource: 'ticker',
            description: 'Ticker message created',
            status: 'success',
        });
        return result;
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Update a ticker message' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTickerMessageDto,
    ) {
        const result = await this.service.update(id, dto);
        this.activityLog.log({
            action: 'ticker:updated',
            resource: 'ticker',
            resourceId: id,
            description: 'Ticker message updated',
            status: 'success',
        });
        return result;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Delete a ticker message' })
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.service.remove(id);
        this.activityLog.log({
            action: 'ticker:deleted',
            resource: 'ticker',
            resourceId: id,
            description: 'Ticker message deleted',
            status: 'success',
        });
        return { success: true };
    }
}
