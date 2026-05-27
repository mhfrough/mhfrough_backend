import {
    Controller, Get, Post, Put, Delete,
    Param, Body, UseGuards, ParseUUIDPipe, Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { CreateGalleryItemDto, UpdateGalleryItemDto, ReorderGalleryDto } from './dto/gallery-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('Gallery')
@Controller('gallery')
export class GalleryController {
    constructor(
        private readonly service: GalleryService,
        private readonly activityLog: ActivityLogService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all published gallery items' })
    findAll() {
        return this.service.findAll(true);
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get all gallery items including unpublished' })
    findAllAdmin() {
        return this.service.findAll(false);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async create(@Body() dto: CreateGalleryItemDto) {
        const result = await this.service.create(dto);
        this.activityLog.log({ action: 'gallery:created', resource: 'gallery', description: `Gallery item created: ${dto.title ?? result.id}`, status: 'success' });
        return result;
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGalleryItemDto) {
        const result = await this.service.update(id, dto);
        this.activityLog.log({ action: 'gallery:updated', resource: 'gallery', resourceId: id, description: `Gallery item updated: ${id}`, status: 'success' });
        return result;
    }

    @Patch('reorder')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Bulk update sort order' })
    async reorder(@Body() dto: ReorderGalleryDto) {
        const result = await this.service.reorder(dto.items);
        this.activityLog.log({ action: 'gallery:reordered', resource: 'gallery', description: 'Gallery items reordered', status: 'success' });
        return result;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        const result = await this.service.remove(id);
        this.activityLog.log({ action: 'gallery:deleted', resource: 'gallery', resourceId: id, description: `Gallery item deleted: ${id}`, status: 'success' });
        return result;
    }
}
