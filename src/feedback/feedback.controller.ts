import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, HttpCode, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, UnapproveDto, ReorderFeedbackDto } from './dto/feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
    constructor(private readonly service: FeedbackService) { }

    @Get()
    @ApiOperation({ summary: 'Get approved feedback/reviews (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'q', required: false, type: String })
    findApproved(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
        @Query('q') q?: string,
    ) {
        return this.service.findApprovedPaginated(page, limit, q);
    }

    @Post()
    @HttpCode(201)
    @Throttle({ default: { ttl: 60000, limit: 2 } })
    @ApiOperation({ summary: 'Submit a review/feedback' })
    create(@Body() dto: CreateFeedbackDto) {
        return this.service.create(dto);
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get all feedback' })
    findAll() {
        return this.service.findAll();
    }

    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    approve(@Param('id') id: string) {
        return this.service.approve(id);
    }

    @Patch(':id/unapprove')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    unapprove(@Param('id') id: string, @Body() dto: UnapproveDto) {
        return this.service.unapprove(id, dto.adminNote);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }

    @Patch('reorder')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Reorder feedback/reviews' })
    reorder(@Body() dto: ReorderFeedbackDto) {
        return this.service.reorder(dto.items);
    }
}
