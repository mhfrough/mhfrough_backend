import {
    Controller, Post, UploadedFile, UseGuards, UseInterceptors,
    BadRequestException, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';
import { ActivityLogService } from '../activity-log/activity-log.service';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_MEDIA_MIME = [...ALLOWED_IMAGE_MIME, 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100 MB

@Controller('upload')
export class UploadController {
    constructor(private readonly activityLog: ActivityLogService) { }

    @Post('image')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    const dest = join(process.cwd(), 'uploads');
                    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
                    cb(null, dest);
                },
                filename: (_req, file, cb) => {
                    const ext = extname(file.originalname).toLowerCase();
                    cb(null, `${randomUUID()}${ext}`);
                },
            }),
            limits: { fileSize: MAX_IMAGE_SIZE },
            fileFilter: (_req, file, cb) => {
                if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
                    return cb(new BadRequestException('Only image files are allowed (JPEG, PNG, WebP, GIF, SVG).'), false);
                }
                cb(null, true);
            },
        }),
    )
    uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request): { url: string } {
        if (!file) throw new BadRequestException('No file provided.');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        this.activityLog.log({ action: 'upload:image', resource: 'upload', description: `Image uploaded: ${file.filename}`, status: 'success' });
        return { url: `${baseUrl}/uploads/${file.filename}` };
    }

    @Post('media')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    const dest = join(process.cwd(), 'uploads');
                    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
                    cb(null, dest);
                },
                filename: (_req, file, cb) => {
                    const ext = extname(file.originalname).toLowerCase();
                    cb(null, `${randomUUID()}${ext}`);
                },
            }),
            limits: { fileSize: MAX_MEDIA_SIZE },
            fileFilter: (_req, file, cb) => {
                if (!ALLOWED_MEDIA_MIME.includes(file.mimetype)) {
                    return cb(new BadRequestException('Unsupported file type. Allowed: images, GIFs, MP4, WebM, OGG, MOV.'), false);
                }
                cb(null, true);
            },
        }),
    )
    uploadMedia(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
    ): { url: string; mimeType: string; fileSize: number; mediaType: string } {
        if (!file) throw new BadRequestException('No file provided.');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const isVideo = file.mimetype.startsWith('video/');
        const isGif = file.mimetype === 'image/gif';
        this.activityLog.log({ action: 'upload:media', resource: 'upload', description: `Media uploaded: ${file.filename} (${file.mimetype})`, status: 'success' });
        return {
            url: `${baseUrl}/uploads/${file.filename}`,
            mimeType: file.mimetype,
            fileSize: file.size,
            mediaType: isVideo ? 'video' : isGif ? 'gif' : 'image',
        };
    }
}
