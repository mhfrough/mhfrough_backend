import {
    Controller, Get, Post, Delete, Param,
    Body, UseGuards, HttpCode, HttpStatus,
    UseInterceptors, UploadedFile, Req, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
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

    /**
     * Public audio-note upload — no auth guard.
     * Visitors do not have a JWT; the socket sessionId is proof of intent.
     * File type restricted to audio/* only; max 10 MB.
     */
    @Post('audio')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    const dest = join(process.cwd(), 'uploads', 'audio');
                    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
                    cb(null, dest);
                },
                filename: (_req, file, cb) => {
                    const ext = extname(file.originalname).toLowerCase() ||
                        (file.mimetype.includes('ogg') ? '.ogg' :
                            file.mimetype.includes('mp4') ? '.m4a' : '.webm');
                    cb(null, `${randomUUID()}${ext}`);
                },
            }),
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype.startsWith('audio/')) {
                    return cb(new BadRequestException('Only audio files are allowed.'), false);
                }
                cb(null, true);
            },
        }),
    )
    uploadChatAudio(@UploadedFile() file: Express.Multer.File, @Req() req: Request): { url: string } {
        if (!file) throw new BadRequestException('No audio file provided.');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        return { url: `${baseUrl}/uploads/audio/${file.filename}` };
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
