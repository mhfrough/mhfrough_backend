import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import * as geoip from 'geoip-lite';
import { VisitorSession } from './visitor-session.entity';
import { PageView } from './page-view.entity';
import { VisitorEvent } from './visitor-event.entity';
import { PingVisitorDto } from './dto/ping-visitor.dto';
import { LeavePageDto } from './dto/leave-page.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { EventsGateway } from '../events/events.gateway';

/** 30 minutes of inactivity starts a new session */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function detectDevice(ua: string): { deviceType: string; browser: string; browserVersion: string | null; os: string; osVersion: string | null } {
    let deviceType = 'desktop';
    if (/tablet|ipad|kindle|playbook|silk/i.test(ua)) deviceType = 'tablet';
    else if (/mobile|android|iphone|ipod|windows phone|blackberry/i.test(ua)) deviceType = 'mobile';

    let browser = 'Unknown';
    let browserVersion: string | null = null;
    if (/Edg\/(\S+)/i.test(ua)) { browser = 'Edge'; browserVersion = ua.match(/Edg\/(\S+)/i)?.[1] ?? null; }
    else if (/OPR\/(\S+)/i.test(ua) || /Opera/i.test(ua)) { browser = 'Opera'; browserVersion = ua.match(/OPR\/(\S+)/i)?.[1] ?? null; }
    else if (/Chrome\/(\S+)/i.test(ua) && !/Chromium/i.test(ua)) { browser = 'Chrome'; browserVersion = ua.match(/Chrome\/(\S+)/i)?.[1]?.split('.')[0] ?? null; }
    else if (/Firefox\/(\S+)/i.test(ua)) { browser = 'Firefox'; browserVersion = ua.match(/Firefox\/(\S+)/i)?.[1]?.split('.')[0] ?? null; }
    else if (/Safari\/\d/i.test(ua)) { browser = 'Safari'; browserVersion = ua.match(/Version\/(\S+)/i)?.[1]?.split('.')[0] ?? null; }
    else if (/Chromium\/(\S+)/i.test(ua)) { browser = 'Chromium'; browserVersion = ua.match(/Chromium\/(\S+)/i)?.[1]?.split('.')[0] ?? null; }

    let os = 'Unknown';
    let osVersion: string | null = null;
    if (/Windows NT (\S+)/i.test(ua)) { os = 'Windows'; osVersion = ua.match(/Windows NT (\S+)/i)?.[1] ?? null; }
    else if (/Mac OS X ([\d_]+)/i.test(ua)) { os = 'macOS'; osVersion = ua.match(/Mac OS X ([\d_]+)/i)?.[1]?.replace(/_/g, '.') ?? null; }
    else if (/Android ([\d.]+)/i.test(ua)) { os = 'Android'; osVersion = ua.match(/Android ([\d.]+)/i)?.[1] ?? null; }
    else if (/iPhone OS ([\d_]+)/i.test(ua) || /iPad.*OS ([\d_]+)/i.test(ua)) { os = 'iOS'; osVersion = (ua.match(/OS ([\d_]+)/i)?.[1] ?? '').replace(/_/g, '.'); }
    else if (/Linux/i.test(ua)) os = 'Linux';

    return { deviceType, browser, browserVersion, os, osVersion };
}

@Injectable()
export class VisitorsService {
    constructor(
        @InjectRepository(VisitorSession) private readonly sessions: Repository<VisitorSession>,
        @InjectRepository(PageView) private readonly pageViews: Repository<PageView>,
        @InjectRepository(VisitorEvent) private readonly visitorEvents: Repository<VisitorEvent>,
        private readonly events: EventsGateway,
    ) { }

    async findOne(sessionId: string): Promise<VisitorSession | null> {
        return this.sessions.findOne({ where: { id: sessionId } });
    }

    async ping(dto: PingVisitorDto, rawIp: string, userAgent: string): Promise<{ sessionId: string }> {
        const ip = rawIp === '::1' ? '127.0.0.1' : rawIp?.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;
        const fingerprint = createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');

        let session: VisitorSession | null = null;
        if (dto.sessionId) {
            session = await this.sessions.findOne({ where: { id: dto.sessionId, fingerprint } });
            if (session?.lastSeenAt) {
                const elapsed = Date.now() - new Date(session.lastSeenAt).getTime();
                if (elapsed > SESSION_TIMEOUT_MS) session = null;
            }
        }

        if (!session) {
            const ipVersion = ip.includes(':') ? 'IPv6' : 'IPv4';
            const geo = geoip.lookup(ip);
            const ua = detectDevice(userAgent);

            session = await this.sessions.save(
                this.sessions.create({
                    fingerprint,
                    ip: rawIp,
                    ipVersion,
                    country: geo?.country ?? null,
                    region: geo?.region ?? null,
                    city: geo?.city ?? null,
                    lat: geo?.ll?.[0] ?? null,
                    lng: geo?.ll?.[1] ?? null,
                    deviceType: ua.deviceType,
                    browser: ua.browser,
                    browserVersion: ua.browserVersion,
                    os: ua.os,
                    osVersion: ua.osVersion,
                    screenRes: dto.screenRes ?? null,
                    language: dto.language ?? null,
                    referrer: dto.referrer ?? null,
                    entryPath: dto.path ?? null,
                    pageViewCount: 0,
                    bounced: true,
                    lastSeenAt: new Date(),
                    contactUser: dto.contactUser ?? null,
                }),
            );
            this.events.emitToAdmin('visitor:session_created', session);
        }

        await this.pageViews.save(
            this.pageViews.create({ sessionId: session.id, path: dto.path ?? null }),
        );

        const pageViewCount = session.pageViewCount + 1;
        const sessionDurationMs = Date.now() - new Date(session.startedAt).getTime();

        const sessionUpdate: Partial<VisitorSession> = {
            pageViewCount,
            bounced: pageViewCount <= 1,
            sessionDurationMs,
            lastSeenAt: new Date(),
        };
        if (dto.contactUser && !session.contactUser) sessionUpdate.contactUser = dto.contactUser;
        await this.sessions.update(session.id, sessionUpdate);

        // Notify admin of which page this visitor is currently on
        this.events.emitToAdmin('visitor:page_view', {
            sessionId: session.id,
            path: dto.path ?? null,
            timestamp: new Date().toISOString(),
        });

        return { sessionId: session.id };
    }

    async leavePage(dto: LeavePageDto): Promise<void> {
        if (dto.timeOnPageMs !== undefined && dto.path) {
            const pv = await this.pageViews.findOne({
                where: { sessionId: dto.sessionId, path: dto.path },
                order: { createdAt: 'DESC' },
            });
            if (pv && pv.timeOnPageMs === null) {
                await this.pageViews.update(pv.id, { timeOnPageMs: dto.timeOnPageMs });
            }
        }
        const session = await this.sessions.findOne({ where: { id: dto.sessionId } });
        if (session) {
            await this.sessions.update(session.id, {
                sessionDurationMs: Date.now() - new Date(session.startedAt).getTime(),
                lastSeenAt: new Date(),
            });
        }
        this.events.emitToAdmin('visitor:left', { sessionId: dto.sessionId });
    }

    async trackEvent(dto: TrackEventDto): Promise<void> {
        // Only track if session exists (ignore orphan events)
        const session = await this.sessions.findOne({ where: { id: dto.sessionId } });
        if (!session) return;

        await this.visitorEvents.save(
            this.visitorEvents.create({
                sessionId: dto.sessionId,
                eventName: dto.eventName,
                path: dto.path ?? null,
                metadata: dto.metadata ?? null,
            }),
        );

        this.events.emitToAdmin('visitor:event', {
            sessionId: dto.sessionId,
            eventName: dto.eventName,
            path: dto.path ?? null,
            metadata: dto.metadata ?? null,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.visitorEvents.delete({ sessionId });
        await this.pageViews.delete({ sessionId });
        await this.sessions.delete({ id: sessionId });
    }

    async clearAll(): Promise<void> {
        await this.visitorEvents.query('TRUNCATE visitor_events, page_views, visitor_sessions RESTART IDENTITY CASCADE');
        this.events.emitToAdmin('visitor:cleared', {});
    }

    async getJourney(sessionId: string): Promise<{
        pageViews: PageView[];
        events: VisitorEvent[];
    }> {
        const [pageViews, events] = await Promise.all([
            this.pageViews.find({
                where: { sessionId },
                order: { createdAt: 'ASC' },
            }),
            this.visitorEvents.find({
                where: { sessionId },
                order: { createdAt: 'ASC' },
            }),
        ]);
        return { pageViews, events };
    }

    async findAll(
        page: number,
        limit: number,
        search?: string,
    ): Promise<{ data: VisitorSession[]; total: number; page: number; limit: number; totalPages: number }> {
        const qb = this.sessions.createQueryBuilder('s')
            .orderBy('s.startedAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (search) {
            qb.where(
                's.ip ILIKE :q OR s.country ILIKE :q OR s.city ILIKE :q OR s.browser ILIKE :q OR s.os ILIKE :q OR s.deviceType ILIKE :q',
                { q: `%${search}%` },
            );
        }

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getStats() {
        const total = await this.sessions.count();
        const unique = await this.sessions
            .createQueryBuilder('s')
            .select('COUNT(DISTINCT s.fingerprint)', 'count')
            .getRawOne()
            .then(r => Number(r?.count ?? 0));

        const bounced = await this.sessions.count({ where: { bounced: true } });
        const totalPageViews = await this.pageViews.count();
        const bounceRate = total > 0 ? Math.round((bounced / total) * 100) : 0;

        const topCountries = await this.sessions
            .createQueryBuilder('s')
            .select('s.country', 'country')
            .addSelect('COUNT(*)', 'count')
            .where('s.country IS NOT NULL')
            .groupBy('s.country')
            .orderBy('count', 'DESC')
            .limit(5)
            .getRawMany();

        const topBrowsers = await this.sessions
            .createQueryBuilder('s')
            .select('s.browser', 'browser')
            .addSelect('COUNT(*)', 'count')
            .where("s.browser IS NOT NULL AND s.browser != 'Unknown'")
            .groupBy('s.browser')
            .orderBy('count', 'DESC')
            .limit(5)
            .getRawMany();

        const deviceDist = await this.sessions
            .createQueryBuilder('s')
            .select('s.deviceType', 'deviceType')
            .addSelect('COUNT(*)', 'count')
            .where('s.deviceType IS NOT NULL')
            .groupBy('s.deviceType')
            .getRawMany();

        const dailySessions = await this.sessions
            .createQueryBuilder('s')
            .select("TO_CHAR(DATE_TRUNC('day', s.startedAt AT TIME ZONE 'UTC'), 'YYYY-MM-DD')", 'day')
            .addSelect('COUNT(*)', 'count')
            .where("s.startedAt > NOW() - INTERVAL '30 days'")
            .groupBy("DATE_TRUNC('day', s.startedAt AT TIME ZONE 'UTC')")
            .orderBy("DATE_TRUNC('day', s.startedAt AT TIME ZONE 'UTC')", 'ASC')
            .getRawMany();

        const topPages = await this.pageViews
            .createQueryBuilder('pv')
            .select("SPLIT_PART(pv.path, '?', 1)", 'path')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG(pv.timeOnPageMs)', 'avgTimeMs')
            .where('pv.path IS NOT NULL')
            .groupBy("SPLIT_PART(pv.path, '?', 1)")
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        const topEvents = await this.visitorEvents
            .createQueryBuilder('e')
            .select('e.eventName', 'eventName')
            .addSelect('COUNT(*)', 'count')
            .groupBy('e.eventName')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        return {
            total,
            unique,
            bounceRate,
            totalPageViews,
            topCountries,
            topBrowsers,
            deviceDist,
            dailySessions,
            topPages,
            topEvents,
        };
    }
}
