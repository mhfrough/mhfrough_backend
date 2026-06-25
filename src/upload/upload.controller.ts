import {
    Controller, Post, UploadedFile, UseGuards, UseInterceptors,
    BadRequestException, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service';

// SVG is intentionally excluded: it is an XML document that can embed
// <script>/onload handlers, making it a stored-XSS vector when served inline.
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_MEDIA_MIME = [...ALLOWED_IMAGE_MIME, 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_MEDIA_SIZE = 100 * 1024 * 1024;

const IMAGE_FOLDERS: Record<string, string> = {
    profile: 'profile/avatar',
    blog: 'blogs/covers',
    project: 'projects/thumbnails',
    content: 'content/inline-images',
};

const MEDIA_FOLDERS: Record<string, string> = {
    gallery: 'gallery/media',
};

@Controller('upload')
export class UploadController {
    constructor(
        private readonly activityLog: ActivityLogService,
        private readonly storage: SupabaseStorageService,
    ) { }

    @Post('image')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: MAX_IMAGE_SIZE },
            fileFilter: (_req, file, cb) => {
                if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
                    return cb(new BadRequestException('Only image files are allowed (JPEG, PNG, WebP, GIF).'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadImage(
        @UploadedFile() file: Express.Multer.File,
        @Query('type') type?: string,
    ): Promise<{ url: string }> {
        if (!file) throw new BadRequestException('No file provided.');
        const folder = IMAGE_FOLDERS[type ?? ''] ?? 'images/misc';
        const { url, contentType, size } = await this.storage.uploadBuffer(file.buffer, file.originalname, file.mimetype, folder);
        const sizeKb = Math.round(size / 1024);
        this.activityLog.log({
            action: 'upload:image',
            resource: 'upload',
            description: `Image uploaded to ${folder}: "${file.originalname}" (${sizeKb} KB, ${contentType})`,
            status: 'success',
            metadata: { folder, originalname: file.originalname, mimetype: contentType, sizeKb },
        });
        return { url };
    }

    @Post('media')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: MAX_MEDIA_SIZE },
            fileFilter: (_req, file, cb) => {
                if (!ALLOWED_MEDIA_MIME.includes(file.mimetype)) {
                    return cb(new BadRequestException('Unsupported file type. Allowed: images, GIFs, MP4, WebM, OGG, MOV.'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadMedia(
        @UploadedFile() file: Express.Multer.File,
        @Query('type') type?: string,
    ): Promise<{ url: string; mimeType: string; fileSize: number; mediaType: string }> {
        if (!file) throw new BadRequestException('No file provided.');
        const folder = MEDIA_FOLDERS[type ?? ''] ?? 'media/misc';
        const { url, contentType, size } = await this.storage.uploadBuffer(file.buffer, file.originalname, file.mimetype, folder);
        const isVideo = contentType.startsWith('video/');
        const isGif = contentType === 'image/gif';
        const sizeMb = (size / (1024 * 1024)).toFixed(1);
        this.activityLog.log({
            action: 'upload:media',
            resource: 'upload',
            description: `Media uploaded to ${folder}: "${file.originalname}" (${contentType}, ${sizeMb} MB)`,
            status: 'success',
            metadata: { folder, originalname: file.originalname, mimetype: contentType, sizeMb: parseFloat(sizeMb), mediaType: isVideo ? 'video' : isGif ? 'gif' : 'image' },
        });
        return { url, mimeType: contentType, fileSize: size, mediaType: isVideo ? 'video' : isGif ? 'gif' : 'image' };
    }
}
