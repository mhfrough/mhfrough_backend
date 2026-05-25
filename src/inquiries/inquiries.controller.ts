import { Controller, Get, Post, Param, Body, UseGuards, HttpCode, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/inquiry.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Inquiries')
@Controller('inquiries')
export class InquiriesController {
    constructor(private readonly service: InquiriesService) { }

    @Post()
    @HttpCode(201)
    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @ApiOperation({ summary: 'Submit a contact inquiry' })
    create(@Body() dto: CreateInquiryDto) {
        return this.service.create(dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Get all inquiries' })
    findAll() {
        return this.service.findAll();
    }

    @Patch(':id/read')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Mark inquiry as read' })
    markRead(@Param('id') id: string) {
        return this.service.markRead(id);
    }
}
