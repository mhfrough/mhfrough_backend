import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailService } from './email.service';
import { SaveDraftDto, SendEmailDto } from './dto/email.dto';

@ApiTags('Email')
@Controller('email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailController {
    constructor(private readonly service: EmailService) { }

    @Get()
    @ApiOperation({ summary: '[Admin] List sent emails or drafts' })
    getMessages(@Query('folder') folder: 'sent' | 'drafts' = 'sent') {
        return this.service.getMessages(folder === 'drafts' ? 'draft' : 'sent');
    }

    @Post('send')
    @ApiOperation({ summary: '[Admin] Send an email via Resend' })
    send(@Body() dto: SendEmailDto) {
        return this.service.send(dto);
    }

    @Post('drafts')
    @ApiOperation({ summary: '[Admin] Save a new draft' })
    saveDraft(@Body() dto: SaveDraftDto) {
        return this.service.saveDraft(dto);
    }

    @Patch('drafts/:id')
    @ApiOperation({ summary: '[Admin] Update a draft' })
    updateDraft(@Param('id') id: string, @Body() dto: SaveDraftDto) {
        return this.service.updateDraft(id, dto);
    }

    @Delete('drafts/:id')
    @ApiOperation({ summary: '[Admin] Delete a draft' })
    deleteDraft(@Param('id') id: string) {
        return this.service.deleteDraft(id);
    }
}
