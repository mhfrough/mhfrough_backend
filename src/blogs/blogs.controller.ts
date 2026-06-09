import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, UseGuards, ParseUUIDPipe,
    ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto, UpdateBlogDto, UnpublishBlogDto } from './dto/blog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
    constructor(private readonly service: BlogsService) { }

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

    @Get('admin/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get blog post by ID' })
    findOneById(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.findOne(id);
    }

    @Get(':slug')
    findBySlug(@Param('slug') slug: string) {
        return this.service.findBySlug(slug);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    create(@Body() dto: CreateBlogDto) {
        return this.service.create(dto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBlogDto) {
        return this.service.update(id, dto);
    }

    @Patch(':id/unpublish')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    unpublish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UnpublishBlogDto) {
        return this.service.unpublish(id, dto.adminNote);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.remove(id);
    }
}
