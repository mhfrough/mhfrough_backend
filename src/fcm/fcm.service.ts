import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { FcmToken } from './fcm-token.entity';
import { PushNotificationLog, PushNotifSource, PushNotifStatus } from './push-notification-log.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    source: PushNotifSource;
}

@Injectable()
export class FcmService implements OnModuleInit {
    private readonly logger = new Logger(FcmService.name);
    private app: admin.app.App | null = null;

    constructor(
        private readonly config: ConfigService,
        @InjectRepository(FcmToken) private readonly tokenRepo: Repository<FcmToken>,
        @InjectRepository(PushNotificationLog) private readonly logRepo: Repository<PushNotificationLog>,
        private readonly activityLog: ActivityLogService,
    ) { }

    onModuleInit() {
        const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

        if (!projectId || !clientEmail || !privateKey) {
            this.logger.warn('Firebase credentials not configured — push notifications disabled');
            return;
        }

        if (admin.apps.length === 0) {
            this.app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
        } else {
            this.app = admin.apps[0] ?? null;
        }

        this.logger.log('Firebase Admin SDK initialized');
    }

    async registerToken(token: string, platform = 'web'): Promise<void> {
        const existing = await this.tokenRepo.findOne({ where: { token } });
        if (!existing) {
            await this.tokenRepo.save(this.tokenRepo.create({ token, platform }));
        }
    }

    async unregisterToken(token: string): Promise<void> {
        await this.tokenRepo.delete({ token });
    }

    async sendPush(payload: PushPayload): Promise<void> {
        if (!this.app) {
            this.logger.warn('Firebase not initialized — skipping push notification');
            await this.log(payload, PushNotifStatus.SKIPPED, 0, 0, 'Firebase not configured');
            this.activityLog.log({
                action: 'push:skipped',
                resource: 'push',
                description: payload.title,
                status: 'error',
                errorMessage: 'Firebase not configured',
            });
            return;
        }

        const tokens = await this.tokenRepo.find();
        if (tokens.length === 0) {
            await this.log(payload, PushNotifStatus.SKIPPED, 0, 0, 'No registered tokens');
            return;
        }

        const tokenStrings = tokens.map(t => t.token);

        try {
            const response = await admin.messaging(this.app).sendEachForMulticast({
                tokens: tokenStrings,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                webpush: {
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        icon: '/icons/icon-192x192.png',
                        badge: '/icons/icon-72x72.png',
                    },
                    fcmOptions: {
                        link: payload.url ?? '/',
                    },
                },
            });

            const failed = response.responses.filter(r => !r.success);
            const status = failed.length === 0
                ? PushNotifStatus.SUCCESS
                : failed.length === tokenStrings.length
                    ? PushNotifStatus.FAILED
                    : PushNotifStatus.PARTIAL;

            // Remove invalid tokens
            const invalidTokens: string[] = [];
            response.responses.forEach((r, i) => {
                if (!r.success) {
                    const errCode = r.error?.code;
                    if (errCode === 'messaging/invalid-registration-token' ||
                        errCode === 'messaging/registration-token-not-registered') {
                        invalidTokens.push(tokenStrings[i]);
                    }
                }
            });

            if (invalidTokens.length > 0) {
                await this.tokenRepo.delete(invalidTokens.map(t => ({ token: t })) as any);
                for (const t of invalidTokens) {
                    await this.tokenRepo.delete({ token: t });
                }
                this.logger.log(`Removed ${invalidTokens.length} invalid FCM token(s)`);
            }

            await this.log(payload, status, response.successCount, failed.length);
            this.activityLog.log({
                action: 'push:sent',
                resource: 'push',
                description: `Push "${payload.title}" sent: ${response.successCount} succeeded, ${failed.length} failed`,
                status: status === PushNotifStatus.FAILED ? 'error' : 'success',
            });
            this.logger.log(`Push sent: ${response.successCount} success, ${failed.length} failed`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            await this.log(payload, PushNotifStatus.FAILED, 0, tokenStrings.length, message);
            this.activityLog.log({
                action: 'push:error',
                resource: 'push',
                description: `Push "${payload.title}" failed`,
                status: 'error',
                errorMessage: message,
            });
            this.logger.error('Failed to send push notification', message);
        }
    }

    private async log(
        payload: PushPayload,
        status: PushNotifStatus,
        sentCount: number,
        failedCount: number,
        errorMessage?: string,
    ): Promise<void> {
        await this.logRepo.save(this.logRepo.create({
            title: payload.title,
            body: payload.body,
            url: payload.url,
            source: payload.source,
            status,
            sentCount,
            failedCount,
            errorMessage,
        }));
    }

    getLogs(limit = 100): Promise<PushNotificationLog[]> {
        return this.logRepo.find({ order: { createdAt: 'DESC' }, take: limit });
    }
}
