import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
    constructor(private readonly service: LeadsService) { }

    @Get()
    @ApiOperation({ summary: '[Admin] Get all leads' })
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: '[Admin] Get a lead with linked records' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: '[Admin] Create a lead' })
    create(@Body() dto: CreateLeadDto) {
        return this.service.create(dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: '[Admin] Update a lead' })
    update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: '[Admin] Delete a lead' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
