import {
    Controller, Post, Body, Req, UploadedFile, UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ToolsImageService } from './tools-image.service';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

/** Shared FileInterceptor config: in-memory, 15 MB cap, image/* only. */
const imageUpload = FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new BadRequestException('Only image files are allowed.'), false);
        }
        cb(null, true);
    },
});

@ApiTags('Tools — Image')
@Controller('tools/image')
export class ToolsImageController {
    constructor(private readonly service: ToolsImageService) { }

    private clientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined;
        return forwarded?.split(',')[0]?.trim() ?? req.ip ?? '0.0.0.0';
    }

    private userAgent(req: Request): string {
        return (req.headers['user-agent'] ?? '').slice(0, 512);
    }

    @Post('compress')
    @Throttle({ default: { limit: 20, ttl: 60000 } })
    @UseInterceptors(imageUpload)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Re-encode an image at a chosen quality to shrink it' })
    compress(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: Record<string, string>,
        @Req() req: Request,
    ) {
        if (!file) throw new BadRequestException('No file provided.');
        const quality = Number(body.quality) || 80;
        return this.service.compress(file, quality, this.clientIp(req), this.userAgent(req));
    }

    @Post('convert')
    @Throttle({ default: { limit: 20, ttl: 60000 } })
    @UseInterceptors(imageUpload)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Convert an image to another format' })
    convert(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: Record<string, string>,
        @Req() req: Request,
    ) {
        if (!file) throw new BadRequestException('No file provided.');
        const format = body.format;
        const quality = Number(body.quality) || 80;
        return this.service.convert(file, format, quality, this.clientIp(req), this.userAgent(req));
    }

    @Post('upscale')
    @Throttle({ default: { limit: 20, ttl: 60000 } })
    @UseInterceptors(imageUpload)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Enlarge an image 2x / 3x / 4x' })
    upscale(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: Record<string, string>,
        @Req() req: Request,
    ) {
        if (!file) throw new BadRequestException('No file provided.');
        const scale = Number(body.scale) || 2;
        return this.service.upscale(file, scale, this.clientIp(req), this.userAgent(req));
    }

    @Post('palette')
    @Throttle({ default: { limit: 20, ttl: 60000 } })
    @UseInterceptors(imageUpload)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Extract the dominant colour palette from an image' })
    palette(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: Record<string, string>,
        @Req() req: Request,
    ) {
        if (!file) throw new BadRequestException('No file provided.');
        const count = Number(body.count) || 6;
        return this.service.palette(file, count, this.clientIp(req), this.userAgent(req));
    }

    @Post('favicon')
    @Throttle({ default: { limit: 20, ttl: 60000 } })
    @UseInterceptors(imageUpload)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Generate a multi-resolution .ico favicon' })
    favicon(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
    ) {
        if (!file) throw new BadRequestException('No file provided.');
        return this.service.favicon(file, this.clientIp(req), this.userAgent(req));
    }
}
