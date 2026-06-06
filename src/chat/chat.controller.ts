import {
    Controller, Get, Post, Delete, Param, Query,
    Body, UseGuards, HttpCode, HttpStatus,
    UseInterceptors, UploadedFile, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { UpdateChatSettingDto } from './dto/chat.dto';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service';

@Controller('chat')
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway,
        private readonly supabaseStorage: SupabaseStorageService,
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
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype.startsWith('audio/')) {
                    return cb(new BadRequestException('Only audio files are allowed.'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadChatAudio(
        @UploadedFile() file: Express.Multer.File,
        @Query('sessionId') sessionId?: string,
    ): Promise<{ url: string }> {
        if (!file) throw new BadRequestException('No audio file provided.');
        const folder = sessionId ? `chat/sessions/${sessionId}` : 'chat/sessions/unknown';
        const url = await this.supabaseStorage.uploadBuffer(file.buffer, file.originalname, file.mimetype, folder);
        return { url };
    }

    // ─── Admin (protected) ────────────────────────────────────────────────────

    /**
     * Admin file upload — JWT protected.
     * Accepts up to 10 files (images, documents, video, audio).
     * Max 25 MB per file. Returns array of { url, name, type, size }.
     */
    @UseGuards(JwtAuthGuard)
    @Post('admin/files')
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: memoryStorage(),
            limits: { fileSize: 25 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                const allowed = [
                    'image/', 'application/pdf', 'application/msword',
                    'application/vnd.openxmlformats', 'application/vnd.ms-',
                    'text/plain', 'video/', 'audio/',
                    'application/zip', 'application/x-zip',
                ];
                const ok = allowed.some(t => file.mimetype.startsWith(t) || file.mimetype.includes(t));
                if (!ok) return cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
                cb(null, true);
            },
        }),
    )
    async uploadAdminFiles(
        @UploadedFiles() files: Express.Multer.File[],
        @Query('sessionId') sessionId?: string,
    ): Promise<{ url: string; name: string; type: string; size: number }[]> {
        if (!files?.length) throw new BadRequestException('No files provided.');
        const folder = sessionId ? `chat/sessions/${sessionId}` : 'chat/sessions/admin';
        const results = await Promise.all(
            files.map(async (f) => {
                const url = await this.supabaseStorage.uploadBuffer(f.buffer, f.originalname, f.mimetype, folder);
                return { url, name: f.originalname, type: f.mimetype, size: f.size };
            }),
        );
        return results;
    }

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
    @Post('sessions/:id/notes')
    @HttpCode(HttpStatus.NO_CONTENT)
    updateNotes(@Param('id') id: string, @Body('notes') notes: string) {
        return this.chatService.updateSessionNotes(id, notes ?? '');
    }

    @UseGuards(JwtAuthGuard)
    @Post('settings')
    updateSettings(@Body() dto: UpdateChatSettingDto) {
        return this.chatService.updateSettings(dto.key, dto.value);
    }
}
