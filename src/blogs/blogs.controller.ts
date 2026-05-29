import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, UseGuards, ParseUUIDPipe,
    ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto, UpdateBlogDto, UnpublishBlogDto } from './dto/blog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
    constructor(
        private readonly service: BlogsService,
        private readonly activityLog: ActivityLogService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all published blog posts (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'q', required: false, type: String })
    @ApiQuery({ name: 'tag', required: false, type: String })
    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
        @Query('q') q?: string,
        @Query('tag') tag?: string,
    ) {
        return this.service.findPublicPaginated(page, limit, q, tag);
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get all blog posts' })
    findAllAdmin() {
        return this.service.findAll(false);
    }

    @Get('tags')
    @ApiOperation({ summary: 'Get distinct blog tags' })
    findTags() {
        return this.service.findDistinctTags();
    }

    @Get(':slug')
    findBySlug(@Param('slug') slug: string) {
        return this.service.findBySlug(slug);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async create(@Body() dto: CreateBlogDto) {
        const result = await this.service.create(dto);
        this.activityLog.log({ action: 'blog:created', resource: 'blog', description: `Blog post created: ${dto.title ?? result.id}`, status: 'success' });
        return result;
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBlogDto) {
        const result = await this.service.update(id, dto);
        this.activityLog.log({ action: 'blog:updated', resource: 'blog', resourceId: id, description: `Blog post updated: ${id}`, status: 'success' });
        return result;
    }

    @Patch(':id/unpublish')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async unpublish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UnpublishBlogDto) {
        const result = await this.service.unpublish(id, dto.adminNote);
        this.activityLog.log({ action: 'blog:unpublished', resource: 'blog', resourceId: id, description: `Blog post unpublished: ${id}`, status: 'success' });
        return result;
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        const result = await this.service.remove(id);
        this.activityLog.log({ action: 'blog:deleted', resource: 'blog', resourceId: id, description: `Blog post deleted: ${id}`, status: 'success' });
        return result;
    }
}
