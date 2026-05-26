import {
    Controller, Get, Post, Delete, Param,
    Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { UpdateSettingsDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

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
    deleteSession(@Param('id') id: string) {
        return this.chatService.deleteSession(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('settings')
    updateSettings(@Body() dto: UpdateSettingsDto) {
        return this.chatService.updateSettings(dto.key, dto.value);
    }
}
