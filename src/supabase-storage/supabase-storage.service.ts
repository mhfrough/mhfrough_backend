import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import sharp from 'sharp';

const BUCKET = 'uploads';

/**
 * Raster image types we re-encode to WebP on upload. Animated GIFs and videos
 * are intentionally excluded — GIF animation would be lost and video is left
 * to the browser. SVG is never uploaded (blocked at the controller as an XSS
 * vector).
 */
const OPTIMIZABLE_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
// Cap the longest stored edge. 1600px covers full-bleed hero/cover images on
// retina displays while shedding the multi-thousand-px originals phones produce.
const MAX_IMAGE_DIMENSION = 1600;
const WEBP_QUALITY = 80;
// Filenames are content-addressed (randomUUID), so a stored object never
// changes — cache it in browsers/CDN for a year. This is the main lever for
// the Supabase "Cached Egress" overage: repeat views serve from cache, not
// from Supabase.
const ONE_YEAR_SECONDS = '31536000';

export interface UploadResult {
    url: string;
    contentType: string;
    size: number;
}

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
    private readonly logger = new Logger(SupabaseStorageService.name);
    private client: SupabaseClient;
    private publicUrlBase: string;

    constructor(private readonly config: ConfigService) { }

    async onModuleInit() {
        const url = this.config.get<string>('SUPABASE_URL');
        const key = this.config.get<string>('SUPABASE_SERVICE_KEY');

        if (!url || !key) {
            this.logger.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY not set — file uploads will fail');
            return;
        }

        this.client = createClient(url, key, { auth: { persistSession: false } });
        this.publicUrlBase = `${url}/storage/v1/object/public/${BUCKET}`;

        const { data: buckets } = await this.client.storage.listBuckets();
        const exists = buckets?.some(b => b.name === BUCKET);
        if (!exists) {
            const { error } = await this.client.storage.createBucket(BUCKET, { public: true });
            if (error) this.logger.error(`Failed to create bucket "${BUCKET}": ${error.message}`);
            else this.logger.log(`Supabase bucket "${BUCKET}" created`);
        } else {
            this.logger.log(`Supabase bucket "${BUCKET}" ready`);
        }
    }

    async uploadBuffer(
        buffer: Buffer,
        originalname: string,
        mimetype: string,
        folder: string,
    ): Promise<UploadResult> {
        if (!this.client) throw new InternalServerErrorException('Supabase Storage is not configured.');

        let outBuffer = buffer;
        let contentType = mimetype;
        let ext = extname(originalname).toLowerCase() || this.mimeToExt(mimetype);

        if (OPTIMIZABLE_IMAGE_MIME.includes(mimetype)) {
            const optimized = await this.optimizeImage(buffer);
            if (optimized) {
                outBuffer = optimized;
                contentType = 'image/webp';
                ext = '.webp';
            }
        }

        const path = `${folder}/${randomUUID()}${ext}`;

        const { error } = await this.client.storage
            .from(BUCKET)
            .upload(path, outBuffer, { contentType, upsert: false, cacheControl: ONE_YEAR_SECONDS });

        if (error) {
            this.logger.error(`Supabase upload failed: ${error.message}`);
            throw new InternalServerErrorException('File upload failed.');
        }

        const { data } = this.client.storage.from(BUCKET).getPublicUrl(path);
        return { url: data.publicUrl, contentType, size: outBuffer.length };
    }

    /**
     * Resize (downscale only) and re-encode a raster image to WebP to cut both
     * storage and egress. Returns null on failure so the caller falls back to
     * storing the original untouched — a bad encode should never block an upload.
     */
    private async optimizeImage(buffer: Buffer): Promise<Buffer | null> {
        try {
            const optimized = await sharp(buffer, { failOn: 'none' })
                .rotate() // bake in EXIF orientation before stripping metadata
                .resize({
                    width: MAX_IMAGE_DIMENSION,
                    height: MAX_IMAGE_DIMENSION,
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .webp({ quality: WEBP_QUALITY })
                .toBuffer();
            // Guard against the rare case where WebP is larger than the source.
            return optimized.length < buffer.length ? optimized : null;
        } catch (err) {
            this.logger.warn(`Image optimization failed, storing original: ${(err as Error).message}`);
            return null;
        }
    }

    /** Delete a file using its full public URL (no-op if URL is not from this bucket). */
    async deleteByUrl(publicUrl: string | null | undefined): Promise<void> {
        if (!publicUrl || !this.client) return;
        const path = this.extractPath(publicUrl);
        if (!path) return;
        const { error } = await this.client.storage.from(BUCKET).remove([path]);
        if (error) this.logger.warn(`Failed to delete "${path}": ${error.message}`);
    }

    /** Delete all files under a folder prefix (e.g. "chat/sessions/abc-123"). */
    async deleteFolder(folderPrefix: string): Promise<void> {
        if (!this.client || !folderPrefix) return;
        const { data, error } = await this.client.storage.from(BUCKET).list(folderPrefix);
        if (error) { this.logger.warn(`Failed to list "${folderPrefix}": ${error.message}`); return; }
        if (!data?.length) return;
        const paths = data.map(f => `${folderPrefix}/${f.name}`);
        const { error: rmErr } = await this.client.storage.from(BUCKET).remove(paths);
        if (rmErr) this.logger.warn(`Failed to delete folder "${folderPrefix}": ${rmErr.message}`);
    }

    private extractPath(publicUrl: string): string | null {
        try {
            // Public URL format: <supabase_url>/storage/v1/object/public/<bucket>/<path>
            const marker = `/object/public/${BUCKET}/`;
            const idx = publicUrl.indexOf(marker);
            if (idx === -1) return null;
            return decodeURIComponent(publicUrl.slice(idx + marker.length));
        } catch {
            return null;
        }
    }

    private mimeToExt(mime: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
            'image/gif': '.gif', 'image/svg+xml': '.svg',
            'video/mp4': '.mp4', 'video/webm': '.webm', 'video/ogg': '.ogv', 'video/quicktime': '.mov',
            'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a',
        };
        return map[mime] ?? '';
    }
}
