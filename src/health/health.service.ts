import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WidgetCache } from '../widgets/widget-cache.entity';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';

const GITHUB_TTL = 10 * 60 * 1000;  // 10 minutes
const RENDER_TTL = 5 * 60 * 1000;   // 5 minutes

type RepoTarget = 'backend' | 'frontend';

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);

    constructor(
        @InjectRepository(WidgetCache)
        private readonly cacheRepo: Repository<WidgetCache>,
        private readonly settingsService: AdminSettingsService,
        private readonly config: ConfigService,
    ) { }

    private async getCache(key: string): Promise<WidgetCache | null> {
        return this.cacheRepo.findOne({ where: { key } });
    }

    private async setCache(key: string, data: Record<string, unknown>): Promise<void> {
        await this.cacheRepo.upsert({ key, data: data as any, lastFetched: new Date() }, ['key']);
    }

    private isFresh(entry: WidgetCache | null, ttl: number): boolean {
        if (!entry?.lastFetched || !entry.data) return false;
        return Date.now() - new Date(entry.lastFetched).getTime() < ttl;
    }

    // ── GitHub last commit ────────────────────────────────────────────────────

    private async getGithubCommit(target: RepoTarget): Promise<Record<string, unknown>> {
        const cacheKey = `gh_commit_${target}`;
        const cached = await this.getCache(cacheKey);
        if (this.isFresh(cached, GITHUB_TTL)) return cached!.data!;

        const settings = await this.settingsService.getSettings();
        const token = settings.githubToken;
        const repo = target === 'backend' ? settings.githubRepoBackend : settings.githubRepoFrontend;

        if (!token || !repo) {
            return cached?.data ?? { error: 'not_configured' };
        }

        // Accept full URL (https://github.com/owner/repo) or bare owner/repo
        const repoSlug = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');

        try {
            const res = await fetch(`https://api.github.com/repos/${repoSlug}/commits?per_page=1`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'mhfrough-dev-admin',
                },
            });
            if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
            const raw = await res.json() as Array<Record<string, any>>;
            const commit = raw[0];

            const data: Record<string, unknown> = {
                sha: (commit.sha as string).slice(0, 7),
                message: (commit.commit.message as string).split('\n')[0],
                author: commit.commit.author?.name ?? commit.author?.login ?? 'Unknown',
                date: commit.commit.author?.date,
                url: commit.html_url,
                repo,
            };
            await this.setCache(cacheKey, data);
            return data;
        } catch (err) {
            this.logger.error(`GitHub fetch failed for ${target}`, err);
            return cached?.data ?? { error: 'fetch_failed' };
        }
    }

    // ── Render deploy status ──────────────────────────────────────────────────

    private async getRenderStatus(target: RepoTarget): Promise<Record<string, unknown>> {
        const cacheKey = `render_status_${target}`;
        const cached = await this.getCache(cacheKey);
        if (this.isFresh(cached, RENDER_TTL)) return cached!.data!;

        const settings = await this.settingsService.getSettings();
        const apiKey = settings.renderApiKey;
        const serviceId = target === 'backend' ? settings.renderServiceIdBackend : settings.renderServiceIdFrontend;

        if (!apiKey || !serviceId) {
            return cached?.data ?? { error: 'not_configured' };
        }

        try {
            const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=1`, {
                headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(`Render API HTTP ${res.status}`);
            const raw = await res.json() as Array<Record<string, any>>;
            const deploy = raw[0]?.deploy;

            const data: Record<string, unknown> = {
                status: deploy?.status ?? 'unknown',
                createdAt: deploy?.createdAt,
                finishedAt: deploy?.finishedAt,
                commitMessage: deploy?.commit?.message?.split('\n')[0],
            };
            await this.setCache(cacheKey, data);
            return data;
        } catch (err) {
            this.logger.error(`Render fetch failed for ${target}`, err);
            return cached?.data ?? { error: 'fetch_failed' };
        }
    }

    // ── Integrations (configured / not configured) ────────────────────────────

    private getIntegrationsStatus(): Record<string, unknown> {
        return {
            supabase: !!this.config.get<string>('SUPABASE_URL') && !!this.config.get<string>('SUPABASE_SERVICE_KEY'),
            firebase: !!this.config.get<string>('FIREBASE_PROJECT_ID') && !!this.config.get<string>('FIREBASE_PRIVATE_KEY'),
        };
    }

    // ── Render Postgres status ────────────────────────────────────────────────

    async getRenderPostgresStatus(): Promise<Record<string, unknown>> {
        const CACHE_KEY = 'render_postgres';
        const cached = await this.getCache(CACHE_KEY);
        if (this.isFresh(cached, RENDER_TTL)) return cached!.data!;

        const settings = await this.settingsService.getSettings();
        const apiKey = settings.renderApiKey;
        const postgresId = settings.renderPostgresId;

        if (!apiKey || !postgresId) {
            return cached?.data ?? { error: 'not_configured' };
        }

        try {
            const res = await fetch(`https://api.render.com/v1/postgres/${postgresId}`, {
                headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(`Render Postgres API HTTP ${res.status}`);
            const raw = await res.json() as Record<string, any>;

            const data: Record<string, unknown> = {
                name: raw.name,
                status: raw.status,
                plan: raw.plan,
                region: raw.region,
                version: raw.databaseMajorVersion,
                createdAt: raw.createdAt,
            };
            await this.setCache(CACHE_KEY, data);
            return data;
        } catch (err) {
            this.logger.error('Render Postgres fetch failed', err);
            return cached?.data ?? { error: 'fetch_failed' };
        }
    }

    // ── Combined overview ──────────────────────────────────────────────────────

    async getDeploymentOverview(): Promise<Record<string, unknown>> {
        const [githubBackend, githubFrontend, renderBackend, renderFrontend, renderPostgres] = await Promise.all([
            this.getGithubCommit('backend'),
            this.getGithubCommit('frontend'),
            this.getRenderStatus('backend'),
            this.getRenderStatus('frontend'),
            this.getRenderPostgresStatus(),
        ]);

        return {
            github: { backend: githubBackend, frontend: githubFrontend },
            render: { backend: renderBackend, frontend: renderFrontend, postgres: renderPostgres },
            integrations: this.getIntegrationsStatus(),
        };
    }
}
