import { Controller, Get, Post, Param, Body, UseGuards, HttpCode, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto, ReplyInquiryDto } from './dto/inquiry.dto';
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

    @Post(':id/reply')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Admin] Reply to an inquiry via email' })
    reply(@Param('id') id: string, @Body() dto: ReplyInquiryDto) {
        return this.service.reply(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({ summary: '[Admin] Delete an inquiry' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
