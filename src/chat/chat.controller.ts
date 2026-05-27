import {
    Controller, Get, Post, Delete, Param,
    Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { UpdateSettingsDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway,
    ) { }

    // ─── Public ───────────────────────────────────────────────────────────────

    /** Called by the chat widget to load greeting/hold messages */
    @Get('settings')
    getSettings() {
        return this.chatService.getSettings();
    }

    // ─── Admin (protected) ────────────────────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Get('sessions')
    getSessions() {
        return this.chatService.getAllSessions();
    }

    @UseGuards(JwtAuthGuard)
    @Get('sessions/:id/messages')
    getMessages(@Param('id') id: string) {
        return this.chatService.getMessages(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('sessions/:id/read')
    @HttpCode(HttpStatus.NO_CONTENT)
    markRead(@Param('id') id: string) {
        return this.chatService.markSessionRead(id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteSession(@Param('id') id: string) {
        await this.chatService.deleteSession(id);
        await this.chatGateway.emitSessionDeleted(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('settings')
    updateSettings(@Body() dto: UpdateSettingsDto) {
        return this.chatService.updateSettings(dto.key, dto.value);
    }
}
