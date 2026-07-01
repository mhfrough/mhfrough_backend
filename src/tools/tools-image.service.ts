import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { ToolUsageLog } from './tool-usage.entity';
import { ImageResult, PaletteColor, PaletteResult } from './dto/image-op.dto';

type ConvertFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';
const CONVERT_FORMATS: ConvertFormat[] = ['jpeg', 'png', 'webp', 'avif', 'gif'];
const UPSCALE_SCALES = [2, 3, 4];
const FAVICON_SIZES = [16, 32, 48, 64];

@Injectable()
export class ToolsImageService {
    private readonly logger = new Logger(ToolsImageService.name);

    constructor(
        @InjectRepository(ToolUsageLog)
        private readonly repo: Repository<ToolUsageLog>,
    ) { }

    // ── Public processing tools ───────────────────────────────────────────────

    /** Re-encode the image in its own format at the requested quality. */
    async compress(
        file: Express.Multer.File,
        quality: number,
        ip: string,
        ua: string,
    ): Promise<ImageResult> {
        const start = Date.now();
        const bytesIn = file.size;
        const toolId = 'image-compress';

        try {
            const img = sharp(file.buffer, { failOn: 'none' });
            const meta = await img.metadata();
            const format = meta.format ?? 'jpeg';

            let pipeline = img;
            switch (format) {
                case 'jpeg':
                    pipeline = pipeline.jpeg({ quality });
                    break;
                case 'webp':
                    pipeline = pipeline.webp({ quality });
                    break;
                case 'png':
                    pipeline = pipeline.png({ compressionLevel: 9, quality });
                    break;
                default:
                    // Unknown/lossless container: leave encoder defaults intact.
                    break;
            }

            const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
            const mime = `image/${format}`;
            const result = this.buildResult(data, mime, format, bytesIn, info.width, info.height, start);

            this.record({
                toolId,
                action: `compress-${format}`,
                status: 'success',
                bytesIn,
                bytesOut: result.bytesOut,
                durationMs: result.durationMs,
                ip,
                userAgent: ua,
            });

            return result;
        } catch (err) {
            throw this.fail(toolId, 'compress', bytesIn, start, ip, ua, err);
        }
    }

    /** Convert the image to a different container format. */
    async convert(
        file: Express.Multer.File,
        format: string,
        quality: number,
        ip: string,
        ua: string,
    ): Promise<ImageResult> {
        const start = Date.now();
        const bytesIn = file.size;
        const toolId = 'image-format';

        try {
            if (!CONVERT_FORMATS.includes(format as ConvertFormat)) {
                throw new Error(`Unsupported target format: ${format}`);
            }
            const target = format as ConvertFormat;

            const { data, info } = await sharp(file.buffer, { failOn: 'none' })
                .toFormat(target, { quality })
                .toBuffer({ resolveWithObject: true });

            const mime = `image/${target}`;
            const result = this.buildResult(data, mime, target, bytesIn, info.width, info.height, start);

            this.record({
                toolId,
                action: `to-${target}`,
                status: 'success',
                bytesIn,
                bytesOut: result.bytesOut,
                durationMs: result.durationMs,
                ip,
                userAgent: ua,
            });

            return result;
        } catch (err) {
            throw this.fail(toolId, `to-${format}`, bytesIn, start, ip, ua, err);
        }
    }

    /** Enlarge the image by an integer factor using Lanczos resampling. */
    async upscale(
        file: Express.Multer.File,
        scale: number,
        ip: string,
        ua: string,
    ): Promise<ImageResult> {
        const start = Date.now();
        const bytesIn = file.size;
        const toolId = 'image-upscale';

        try {
            if (!UPSCALE_SCALES.includes(scale)) {
                throw new Error(`Unsupported scale factor: ${scale}`);
            }

            const img = sharp(file.buffer, { failOn: 'none' });
            const meta = await img.metadata();
            const format = meta.format ?? 'png';
            if (!meta.width || !meta.height) {
                throw new Error('Could not read image dimensions.');
            }

            const targetW = meta.width * scale;
            const targetH = meta.height * scale;

            const { data, info } = await img
                .resize(targetW, targetH, { kernel: 'lanczos3' })
                .toBuffer({ resolveWithObject: true });

            const mime = `image/${format}`;
            const result = this.buildResult(data, mime, format, bytesIn, info.width, info.height, start);

            this.record({
                toolId,
                action: `upscale-${scale}x`,
                status: 'success',
                bytesIn,
                bytesOut: result.bytesOut,
                durationMs: result.durationMs,
                ip,
                userAgent: ua,
            });

            return result;
        } catch (err) {
            throw this.fail(toolId, `upscale-${scale}x`, bytesIn, start, ip, ua, err);
        }
    }

    /** Extract the most common colours via quantised population counting. */
    async palette(
        file: Express.Multer.File,
        count: number,
        ip: string,
        ua: string,
    ): Promise<PaletteResult> {
        const start = Date.now();
        const bytesIn = file.size;
        const toolId = 'image-palette';
        const want = count > 0 ? count : 6;

        try {
            const { data, info } = await sharp(file.buffer, { failOn: 'none' })
                .resize(120, 120, { fit: 'inside' })
                .raw()
                .ensureAlpha()
                .toBuffer({ resolveWithObject: true });

            const channels = info.channels; // 4 after ensureAlpha
            const buckets = new Map<string, { r: number; g: number; b: number; population: number }>();

            for (let i = 0; i + channels - 1 < data.length; i += channels) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // Skip near-transparent pixels — they would skew the palette.
                if (a < 16) continue;

                // Quantise each channel to the nearest multiple of 32.
                const qr = Math.round(r / 32) * 32;
                const qg = Math.round(g / 32) * 32;
                const qb = Math.round(b / 32) * 32;
                const key = `${qr},${qg},${qb}`;

                const bucket = buckets.get(key);
                if (bucket) {
                    bucket.r += r;
                    bucket.g += g;
                    bucket.b += b;
                    bucket.population += 1;
                } else {
                    buckets.set(key, { r, g, b, population: 1 });
                }
            }

            const colors: PaletteColor[] = [...buckets.values()]
                .sort((a, b) => b.population - a.population)
                .slice(0, want)
                .map((bucket) => {
                    const r = Math.round(bucket.r / bucket.population);
                    const g = Math.round(bucket.g / bucket.population);
                    const b = Math.round(bucket.b / bucket.population);
                    return { hex: this.rgbToHex(r, g, b), r, g, b, population: bucket.population };
                });

            this.record({
                toolId,
                action: `palette-${want}`,
                status: 'success',
                bytesIn,
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
            });

            return { colors };
        } catch (err) {
            throw this.fail(toolId, `palette-${want}`, bytesIn, start, ip, ua, err);
        }
    }

    /** Build a multi-resolution .ico favicon from the source image. */
    async favicon(
        file: Express.Multer.File,
        ip: string,
        ua: string,
    ): Promise<ImageResult> {
        const start = Date.now();
        const bytesIn = file.size;
        const toolId = 'favicon-ico';

        try {
            const buffers = await Promise.all(
                FAVICON_SIZES.map((size) =>
                    sharp(file.buffer, { failOn: 'none' }).resize(size, size).png().toBuffer(),
                ),
            );

            const ico = await pngToIco(buffers);
            const bytesOut = ico.length;
            const savedBytes = bytesIn - bytesOut;
            const savedPct = bytesIn > 0 ? Math.round((savedBytes / bytesIn) * 10000) / 100 : 0;
            const durationMs = Date.now() - start;

            this.record({
                toolId,
                action: 'favicon',
                status: 'success',
                bytesIn,
                bytesOut,
                durationMs,
                ip,
                userAgent: ua,
            });

            return {
                output: this.toDataUrl(ico, 'image/x-icon'),
                format: 'ico',
                bytesIn,
                bytesOut,
                savedBytes,
                savedPct,
                width: 64,
                height: 64,
                durationMs,
            };
        } catch (err) {
            throw this.fail(toolId, 'favicon', bytesIn, start, ip, ua, err);
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private toDataUrl(buf: Buffer, mime: string): string {
        return `data:${mime};base64,${buf.toString('base64')}`;
    }

    private rgbToHex(r: number, g: number, b: number): string {
        const h = (n: number) => n.toString(16).padStart(2, '0');
        return `#${h(r)}${h(g)}${h(b)}`;
    }

    /** Assemble the common ImageResult payload from an encoded buffer. */
    private buildResult(
        buf: Buffer,
        mime: string,
        format: string,
        bytesIn: number,
        width: number,
        height: number,
        start: number,
    ): ImageResult {
        const bytesOut = buf.length;
        const savedBytes = bytesIn - bytesOut;
        const savedPct = bytesIn > 0 ? Math.round((savedBytes / bytesIn) * 10000) / 100 : 0;
        return {
            output: this.toDataUrl(buf, mime),
            format,
            bytesIn,
            bytesOut,
            savedBytes,
            savedPct,
            width,
            height,
            durationMs: Date.now() - start,
        };
    }

    /** Record an error row and produce the BadRequestException to throw. */
    private fail(
        toolId: string,
        action: string,
        bytesIn: number,
        start: number,
        ip: string,
        ua: string,
        err: unknown,
    ): BadRequestException {
        const msg = err instanceof Error ? err.message : String(err);
        this.record({
            toolId,
            action,
            status: 'error',
            bytesIn,
            durationMs: Date.now() - start,
            ip,
            userAgent: ua,
            errorMessage: msg.slice(0, 500),
        });
        return new BadRequestException(msg);
    }

    /** Persist a usage row. Never throws — analytics must not break the tool. */
    private record(partial: Partial<ToolUsageLog>): void {
        this.repo
            .save(this.repo.create(partial))
            .catch((err) => this.logger.error('Failed to write tool usage log', err));
    }
}
