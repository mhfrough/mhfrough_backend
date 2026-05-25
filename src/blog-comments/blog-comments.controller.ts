import {
    Controller, Get, Post, Delete, Patch,
    Param, Body, UseGuards, ParseUUIDPipe, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BlogCommentsService } from './blog-comments.service';
import { CreateBlogCommentDto, UnapproveCommentDto } from './dto/blog-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Blog Comments')
@Controller('blog-comments')
export class BlogCommentsController {
    constructor(private readonly service: BlogCommentsService) { }

    /** Public: get approved comments for a post */
    @Get('post/:blogId')
    @ApiOperation({ summary: 'Get approved comments for a blog post' })
    findApproved(@Param('blogId', ParseUUIDPipe) blogId: string) {
        return this.service.findApproved(blogId);
    }

    /** Public: approved comment count for a post */
    @Get('post/:blogId/count')
    @ApiOperation({ summary: 'Get approved comment count' })
    async countApproved(@Param('blogId', ParseUUIDPipe) blogId: string) {
        const count = await this.service.countApproved(blogId);
        return { count };
    }

    /** Public: submit a comment */
    @Post('post/:blogId')
    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @HttpCode(201)
    @ApiOperation({ summary: 'Submit a comment on a blog post' })
    submit(
        @Param('blogId', ParseUUIDPipe) blogId: string,
        @Body() dto: CreateBlogCommentDto,
    ) {
        return this.service.submit(blogId, dto);
    }

    /** Admin: all pending comments */
    @Get('pending')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] List pending comments' })
    findPending() {
        return this.service.findPending();
    }

    /** Admin: all comments */
    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] List all comments' })
    findAll() {
        return this.service.findAll();
    }

    /** Admin: approve */
    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Approve a comment' })
    approve(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.approve(id);
    }

    /** Admin: unapprove */
    @Patch(':id/unapprove')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Unapprove a comment' })
    unapprove(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UnapproveCommentDto) {
        return this.service.unapprove(id, dto.adminNote);
    }

    /** Admin: delete */
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({ summary: '[Admin] Delete a comment' })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.remove(id);
    }
}
