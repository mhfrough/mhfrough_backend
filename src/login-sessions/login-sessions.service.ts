import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginSession } from './login-session.entity';
import * as geoip from 'geoip-lite';
import { EventsGateway } from '../events/events.gateway';

export function parseUserAgent(ua: string | undefined): { browser: string; os: string } {
    if (!ua) return { browser: 'Unknown', os: 'Unknown' };
    let browser = 'Unknown';
    let os = 'Unknown';

    if (/Windows NT/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
    else if (/Chrome\/\d/i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
    else if (/Firefox\/\d/i.test(ua)) browser = 'Firefox';
    else if (/Safari\/\d/i.test(ua)) browser = 'Safari';
    else if (/Chromium/i.test(ua)) browser = 'Chromium';

    return { browser, os };
}

@Injectable()
export class LoginSessionsService {
    constructor(
        @InjectRepository(LoginSession) private readonly repo: Repository<LoginSession>,
        private readonly events: EventsGateway,
    ) { }

    create(data: {
        userId: string;
        ip?: string;
        userAgent?: string;
    }): Promise<LoginSession> {
        const { browser, os } = parseUserAgent(data.userAgent);

        // Normalize IPv6 loopback to IPv4 so geoip can handle it
        const rawIp = data.ip ?? null;
        const lookupIp = rawIp === '::1' ? '127.0.0.1' : rawIp?.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;
        const geo = lookupIp ? geoip.lookup(lookupIp) : null;

        const session = this.repo.create({
            userId: data.userId,
            ip: rawIp,
            userAgent: data.userAgent ?? null,
            browser,
            os,
            country: geo?.country ?? null,
            city: geo?.city ?? null,
            isActive: true,
        });
        return this.repo.save(session).then(saved => {
            this.emitSessionsUpdate(data.userId);
            return saved;
        });
    }

    findAll(): Promise<LoginSession[]> {
        return this.repo.find({ order: { loginAt: 'DESC' } });
    }

    async revoke(id: string): Promise<void> {
        const session = await this.repo.findOne({ where: { id } });
        await this.repo.update(id, { isActive: false, revokedAt: new Date() });
        if (session?.userId) this.emitSessionsUpdate(session.userId);
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await this.repo
            .createQueryBuilder()
            .update(LoginSession)
            .set({ isActive: false, revokedAt: new Date() })
            .where('userId = :userId AND isActive = true', { userId })
            .execute();
        this.emitSessionsUpdate(userId);
    }

    async revokeAllExcept(userId: string, excludeSessionId: string): Promise<void> {
        await this.repo
            .createQueryBuilder()
            .update(LoginSession)
            .set({ isActive: false, revokedAt: new Date() })
            .where('userId = :userId AND isActive = true AND id != :excludeSessionId', { userId, excludeSessionId })
            .execute();
        this.emitSessionsUpdate(userId);
    }

    async clearRevoked(userId: string): Promise<void> {
        await this.repo
            .createQueryBuilder()
            .delete()
            .from(LoginSession)
            .where('userId = :userId AND isActive = false', { userId })
            .execute();
        this.emitSessionsUpdate(userId);
    }

    private async emitSessionsUpdate(userId: string): Promise<void> {
        const sessions = await this.repo.find({ where: { userId }, order: { loginAt: 'DESC' } });
        this.events.emitToAdmin('session:list_updated', sessions);
    }
}
