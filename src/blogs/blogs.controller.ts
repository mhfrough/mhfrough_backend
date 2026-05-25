import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto, UpdateBlogDto, UnpublishBlogDto } from './dto/blog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
    constructor(private readonly service: BlogsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all published blog posts' })
    findAll() {
        return this.service.findAll(true);
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get all blog posts' })
    findAllAdmin() {
        return this.service.findAll(false);
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
