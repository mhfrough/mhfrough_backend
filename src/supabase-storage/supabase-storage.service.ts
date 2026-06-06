import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const BUCKET = 'uploads';

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
    ): Promise<string> {
        if (!this.client) throw new InternalServerErrorException('Supabase Storage is not configured.');

        const ext = extname(originalname).toLowerCase() || this.mimeToExt(mimetype);
        const path = `${folder}/${randomUUID()}${ext}`;

        const { error } = await this.client.storage
            .from(BUCKET)
            .upload(path, buffer, { contentType: mimetype, upsert: false });

        if (error) {
            this.logger.error(`Supabase upload failed: ${error.message}`);
            throw new InternalServerErrorException('File upload failed.');
        }

        const { data } = this.client.storage.from(BUCKET).getPublicUrl(path);
        return data.publicUrl;
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
