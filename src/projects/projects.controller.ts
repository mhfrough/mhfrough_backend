import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, UseGuards, ParseUUIDPipe,
    ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, UnpublishProjectDto, PatchFeaturedDto } from './dto/project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
    constructor(private readonly service: ProjectsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all published projects (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'q', required: false, type: String })
    @ApiQuery({ name: 'tag', required: false, type: String })
    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
        @Query('q') q?: string,
        @Query('tag') tag?: string,
    ) {
        return this.service.findPublicPaginated(page, limit, q, tag);
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get all projects including unpublished' })
    findAllAdmin() {
        return this.service.findAll(false);
    }

    @Get('featured')
    @ApiOperation({ summary: 'Get featured published projects' })
    findFeatured() {
        return this.service.findFeatured();
    }

    @Get('tags')
    @ApiOperation({ summary: 'Get distinct project tags' })
    findTags() {
        return this.service.findDistinctTags();
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get published project by slug' })
    findBySlug(@Param('slug') slug: string) {
        return this.service.findBySlug(slug);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    create(@Body() dto: CreateProjectDto) {
        return this.service.create(dto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) {
        return this.service.update(id, dto);
    }

    @Patch(':id/featured')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Toggle featured flag' })
    patchFeatured(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PatchFeaturedDto) {
        return this.service.patchFeatured(id, dto.featured);
    }

    @Patch(':id/unpublish')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    unpublish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UnpublishProjectDto) {
        return this.service.unpublish(id, dto.adminNote);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.remove(id);
    }

    @Patch('reorder')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Reorder projects' })
    reorder(@Body() dto: { items: { id: string; sortOrder: number }[] }) {
        return this.service.reorder(dto.items);
    }
}
