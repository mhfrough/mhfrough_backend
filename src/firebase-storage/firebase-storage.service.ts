import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class FirebaseStorageService {
    private readonly logger = new Logger(FirebaseStorageService.name);

    constructor(private readonly config: ConfigService) { }

    private getBucket() {
        const storageBucket = this.config.get<string>('FIREBASE_STORAGE_BUCKET');
        if (!storageBucket) throw new InternalServerErrorException('FIREBASE_STORAGE_BUCKET is not configured.');

        // Initialize Firebase Admin if no app exists yet
        if (admin.apps.length === 0) {
            const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
            const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
            const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
            if (!projectId || !clientEmail || !privateKey) {
                throw new InternalServerErrorException('Firebase credentials are not fully configured.');
            }
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
        }

        return admin.storage().bucket(storageBucket);
    }

    async uploadBuffer(
        buffer: Buffer,
        originalname: string,
        mimetype: string,
        folder: string,
    ): Promise<string> {
        const bucket = this.getBucket();
        const ext = extname(originalname).toLowerCase() || this.mimeToExt(mimetype);
        const filename = `${folder}/${randomUUID()}${ext}`;
        const file = bucket.file(filename);

        try {
            await file.save(buffer, {
                metadata: { contentType: mimetype },
                public: true,
            });
        } catch (err) {
            this.logger.error(`Firebase Storage upload failed: ${err?.message}`, err?.stack);
            throw new InternalServerErrorException('File upload to Firebase Storage failed.');
        }

        return `https://storage.googleapis.com/${bucket.name}/${filename}`;
    }

    private mimeToExt(mime: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
            'image/svg+xml': '.svg',
            'video/mp4': '.mp4',
            'video/webm': '.webm',
            'video/ogg': '.ogv',
            'video/quicktime': '.mov',
            'audio/webm': '.webm',
            'audio/ogg': '.ogg',
            'audio/mp4': '.m4a',
        };
        return map[mime] ?? '';
    }
}
