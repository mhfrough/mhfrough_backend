import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, UnapproveDto } from './dto/feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
    constructor(private readonly service: FeedbackService) { }

    @Get()
    @ApiOperation({ summary: 'Get approved feedback/reviews' })
    findApproved() {
        return this.service.findApproved();
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
}
