import {
    Controller, Get, Post, Put, Delete,
    Param, Body, UseGuards, ParseUUIDPipe, Patch,
    Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { CreateGalleryItemDto, UpdateGalleryItemDto } from './dto/gallery-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Gallery')
@Controller('gallery')
export class GalleryController {
    constructor(private readonly service: GalleryService) { }

    @Get()
    @ApiOperation({ summary: 'Get paginated published gallery items' })
    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
        @Query('q') q?: string,
        @Query('category') category?: string,
        @Query('tag') tag?: string,
    ) {
        return this.service.findPublicPaginated(page, limit, q, category, tag);
    }

    @Get('categories')
    @ApiOperation({ summary: 'Get distinct published gallery categories' })
    findCategories() {
        return this.service.findDistinctCategories();
    }

    @Get('tags')
    @ApiOperation({ summary: 'Get distinct gallery tags' })
    findTags() {
        return this.service.findDistinctTags();
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
    create(@Body() dto: CreateGalleryItemDto) {
        return this.service.create(dto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGalleryItemDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.remove(id);
    }
}
