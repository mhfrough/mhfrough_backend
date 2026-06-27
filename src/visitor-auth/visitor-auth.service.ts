import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { VisitorUser } from './visitor-user.entity';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

export type OAuthProvider = 'google' | 'github' | 'linkedin' | 'discord';

export interface OAuthProfile {
    id: string;
    email: string | null;
    name: string | null;
    picture: string | null;
}

export interface EnabledProvider {
    provider: string;
    label: string;
}

@Injectable()
export class VisitorAuthService {
    constructor(
        @InjectRepository(VisitorUser)
        private readonly repo: Repository<VisitorUser>,
        private readonly jwtService: JwtService,
        private readonly adminSettings: AdminSettingsService,
        private readonly activityLog: ActivityLogService,
    ) { }

    async getEnabledProviders(): Promise<EnabledProvider[]> {
        const s = await this.adminSettings.getSettings();
        if (!s.visitorAuthEnabled) return [];
        const all: { provider: OAuthProvider; label: string; enabled: boolean }[] = [
            { provider: 'google', label: 'Google', enabled: s.googleOAuthEnabled && !!s.googleClientId && !!s.googleClientSecret },
            { provider: 'github', label: 'GitHub', enabled: s.githubOAuthEnabled && !!s.githubClientId && !!s.githubClientSecret },
            { provider: 'linkedin', label: 'LinkedIn', enabled: s.linkedinOAuthEnabled && !!s.linkedinClientId && !!s.linkedinClientSecret },
            { provider: 'discord', label: 'Discord', enabled: s.discordOAuthEnabled && !!s.discordClientId && !!s.discordClientSecret },
        ];
        return all.filter(p => p.enabled).map(({ provider, label }) => ({ provider, label }));
    }

    async isProviderEnabled(provider: OAuthProvider): Promise<boolean> {
        const s = await this.adminSettings.getSettings();
        if (!s.visitorAuthEnabled) return false;
        switch (provider) {
            case 'google': return s.googleOAuthEnabled && !!s.googleClientId && !!s.googleClientSecret;
            case 'github': return s.githubOAuthEnabled && !!s.githubClientId && !!s.githubClientSecret;
            case 'linkedin': return s.linkedinOAuthEnabled && !!s.linkedinClientId && !!s.linkedinClientSecret;
            case 'discord': return s.discordOAuthEnabled && !!s.discordClientId && !!s.discordClientSecret;
        }
    }

    // ── OAuth URL Builders ────────────────────────────────────────────────────

    buildGoogleAuthUrl(settings: any, backendBase: string): string {
        const params = new URLSearchParams({
            client_id: settings.googleClientId!,
            redirect_uri: `${backendBase}/visitor-auth/google/callback`,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'online',
            prompt: 'select_account',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }

    buildGithubAuthUrl(settings: any, backendBase: string): string {
        const params = new URLSearchParams({
            client_id: settings.githubClientId!,
            redirect_uri: `${backendBase}/visitor-auth/github/callback`,
            scope: 'read:user user:email',
        });
        return `https://github.com/login/oauth/authorize?${params}`;
    }

    buildLinkedinAuthUrl(settings: any, backendBase: string): string {
        const params = new URLSearchParams({
            client_id: settings.linkedinClientId!,
            redirect_uri: `${backendBase}/visitor-auth/linkedin/callback`,
            response_type: 'code',
            scope: 'openid profile email',
        });
        return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    }

    buildDiscordAuthUrl(settings: any, backendBase: string): string {
        const params = new URLSearchParams({
            client_id: settings.discordClientId!,
            redirect_uri: `${backendBase}/visitor-auth/discord/callback`,
            response_type: 'code',
            scope: 'identify email',
        });
        return `https://discord.com/api/oauth2/authorize?${params}`;
    }

    // ── OAuth Code Exchange ───────────────────────────────────────────────────

    async exchangeGoogleCode(code: string, settings: any, backendBase: string): Promise<OAuthProfile> {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: settings.googleClientId!,
                client_secret: settings.googleClientSecret!,
                redirect_uri: `${backendBase}/visitor-auth/google/callback`,
                grant_type: 'authorization_code',
            }),
        });
        const tokens = await tokenRes.json() as any;
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const u = await userRes.json() as any;
        return { id: u.sub, email: u.email ?? null, name: u.name ?? null, picture: u.picture ?? null };
    }

    async exchangeGithubCode(code: string, settings: any, backendBase: string): Promise<OAuthProfile> {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                client_id: settings.githubClientId!,
                client_secret: settings.githubClientSecret!,
                code,
                redirect_uri: `${backendBase}/visitor-auth/github/callback`,
            }),
        });
        const tokens = await tokenRes.json() as any;
        const userRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'mhfrough.dev' },
        });
        const u = await userRes.json() as any;
        let email: string | null = u.email ?? null;
        if (!email) {
            const emailsRes = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'mhfrough.dev' },
            });
            const emails = await emailsRes.json() as any[];
            email = (Array.isArray(emails) ? emails.find((e: any) => e.primary && e.verified)?.email : null) ?? null;
        }
        return { id: String(u.id), email, name: u.name || u.login || null, picture: u.avatar_url ?? null };
    }

    async exchangeLinkedinCode(code: string, settings: any, backendBase: string): Promise<OAuthProfile> {
        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: settings.linkedinClientId!,
                client_secret: settings.linkedinClientSecret!,
                redirect_uri: `${backendBase}/visitor-auth/linkedin/callback`,
                grant_type: 'authorization_code',
            }),
        });
        const tokens = await tokenRes.json() as any;
        // LinkedIn OIDC userinfo endpoint (requires openid scope)
        const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const u = await userRes.json() as any;
        return { id: u.sub, email: u.email ?? null, name: u.name ?? null, picture: u.picture ?? null };
    }

    async exchangeDiscordCode(code: string, settings: any, backendBase: string): Promise<OAuthProfile> {
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: settings.discordClientId!,
                client_secret: settings.discordClientSecret!,
                redirect_uri: `${backendBase}/visitor-auth/discord/callback`,
                grant_type: 'authorization_code',
            }),
        });
        const tokens = await tokenRes.json() as any;
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const u = await userRes.json() as any;
        const picture = u.avatar
            ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
            : null;
        return { id: u.id, email: u.email ?? null, name: u.global_name || u.username || null, picture };
    }

    // ── Visitor User ──────────────────────────────────────────────────────────

    async findOrCreate(provider: OAuthProvider, profile: OAuthProfile): Promise<VisitorUser> {
        let visitor = await this.repo.findOne({ where: { provider, providerId: profile.id } });
        if (!visitor) {
            visitor = this.repo.create({
                provider,
                providerId: profile.id,
                email: profile.email,
                displayName: profile.name,
                avatarUrl: profile.picture,
                lastLoginAt: new Date(),
            });
        } else {
            if (profile.name) visitor.displayName = profile.name;
            if (profile.picture) visitor.avatarUrl = profile.picture;
            if (profile.email) visitor.email = profile.email;
            visitor.lastLoginAt = new Date();
        }
        return this.repo.save(visitor);
    }

    async findById(id: string): Promise<VisitorUser | null> {
        return this.repo.findOne({ where: { id } });
    }

    // ── JWT ───────────────────────────────────────────────────────────────────

    issueToken(visitor: VisitorUser): string {
        const secret = process.env.VISITOR_JWT_SECRET ?? process.env.JWT_SECRET;
        return this.jwtService.sign(
            { sub: visitor.id, type: 'visitor', provider: visitor.provider },
            { secret, expiresIn: '30d' },
        );
    }

    async verifyToken(token: string): Promise<{ sub: string; type: string } | null> {
        try {
            const secret = process.env.VISITOR_JWT_SECRET ?? process.env.JWT_SECRET;
            return this.jwtService.verify(token, { secret }) as { sub: string; type: string };
        } catch {
            return null;
        }
    }

    // ── Logging ───────────────────────────────────────────────────────────────

    async logAuth(visitor: VisitorUser, ip = 'unknown') {
        await this.activityLog.log({
            action: 'visitor-auth:login',
            resource: 'visitor_users',
            resourceId: visitor.id,
            description: `Visitor "${visitor.displayName ?? visitor.email ?? visitor.id}" signed in via ${visitor.provider}. IP: ${ip}`,
            status: 'success',
            metadata: { provider: visitor.provider, email: visitor.email, ip },
        });
    }
}
