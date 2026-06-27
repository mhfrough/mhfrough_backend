import { Controller, Get, Post, Query, Req, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Response } from 'express';
import { VisitorAuthService, OAuthProvider } from './visitor-auth.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';

@ApiTags('Visitor Auth')
@Controller('visitor-auth')
export class VisitorAuthController {
    constructor(
        private readonly service: VisitorAuthService,
        private readonly adminSettings: AdminSettingsService,
    ) { }

    private get backendBase(): string {
        return (process.env.BACKEND_URL ?? 'http://localhost:3023') + '/api/v1';
    }

    private get frontendUrl(): string {
        return process.env.FRONTEND_URL ?? 'http://localhost:4223';
    }

    private setCookie(res: Response, token: string) {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('visitor_token', token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
        });
    }

    // ── Public ────────────────────────────────────────────────────────────────

    @Get('providers')
    @ApiOperation({ summary: 'List enabled OAuth providers (public)' })
    async getProviders() {
        return this.service.getEnabledProviders();
    }

    @Get('me')
    @ApiOperation({ summary: 'Get current visitor profile from cookie (public)' })
    async getMe(@Req() req: Request) {
        const token = (req as any).cookies?.['visitor_token'];
        if (!token) return null;
        const payload = await this.service.verifyToken(token);
        if (!payload || payload.type !== 'visitor') return null;
        return this.service.findById(payload.sub);
    }

    @Post('logout')
    @HttpCode(200)
    @ApiOperation({ summary: 'Clear visitor session cookie' })
    logout(@Res({ passthrough: true }) res: Response) {
        const isProd = process.env.NODE_ENV === 'production';
        res.clearCookie('visitor_token', { secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' });
        return { message: 'Signed out' };
    }

    // ── Google ────────────────────────────────────────────────────────────────

    @Get('google')
    @ApiOperation({ summary: 'Redirect to Google OAuth' })
    async googleLogin(@Res() res: Response) {
        const s = await this.adminSettings.getSettings();
        if (!s.visitorAuthEnabled || !s.googleOAuthEnabled || !s.googleClientId) {
            return res.redirect(`${this.frontendUrl}/?auth_error=provider_disabled`);
        }
        return res.redirect(this.service.buildGoogleAuthUrl(s, this.backendBase));
    }

    @Get('google/callback')
    @ApiOperation({ summary: 'Google OAuth callback' })
    async googleCallback(
        @Query('code') code: string,
        @Query('error') error: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        if (error || !code) {
            return res.redirect(`${this.frontendUrl}/?auth_error=google_denied`);
        }
        try {
            const s = await this.adminSettings.getSettings();
            const profile = await this.service.exchangeGoogleCode(code, s, this.backendBase);
            const visitor = await this.service.findOrCreate('google', profile);
            this.setCookie(res, this.service.issueToken(visitor));
            await this.service.logAuth(visitor, req.ip);
            return res.redirect(`${this.frontendUrl}/?visitor_login=1`);
        } catch {
            return res.redirect(`${this.frontendUrl}/?auth_error=google_failed`);
        }
    }

    // ── GitHub ────────────────────────────────────────────────────────────────

    @Get('github')
    @ApiOperation({ summary: 'Redirect to GitHub OAuth' })
    async githubLogin(@Res() res: Response) {
        const s = await this.adminSettings.getSettings();
        if (!s.visitorAuthEnabled || !s.githubOAuthEnabled || !s.githubClientId) {
            return res.redirect(`${this.frontendUrl}/?auth_error=provider_disabled`);
        }
        return res.redirect(this.service.buildGithubAuthUrl(s, this.backendBase));
    }

    @Get('github/callback')
    @ApiOperation({ summary: 'GitHub OAuth callback' })
    async githubCallback(
        @Query('code') code: string,
        @Query('error') error: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        if (error || !code) {
            return res.redirect(`${this.frontendUrl}/?auth_error=github_denied`);
        }
        try {
            const s = await this.adminSettings.getSettings();
            const profile = await this.service.exchangeGithubCode(code, s, this.backendBase);
            const visitor = await this.service.findOrCreate('github', profile);
            this.setCookie(res, this.service.issueToken(visitor));
            await this.service.logAuth(visitor, req.ip);
            return res.redirect(`${this.frontendUrl}/?visitor_login=1`);
        } catch {
            return res.redirect(`${this.frontendUrl}/?auth_error=github_failed`);
        }
    }

    // ── LinkedIn ──────────────────────────────────────────────────────────────

    @Get('linkedin')
    @ApiOperation({ summary: 'Redirect to LinkedIn OAuth' })
    async linkedinLogin(@Res() res: Response) {
        const s = await this.adminSettings.getSettings();
        if (!s.visitorAuthEnabled || !s.linkedinOAuthEnabled || !s.linkedinClientId) {
            return res.redirect(`${this.frontendUrl}/?auth_error=provider_disabled`);
        }
        return res.redirect(this.service.buildLinkedinAuthUrl(s, this.backendBase));
    }

    @Get('linkedin/callback')
    @ApiOperation({ summary: 'LinkedIn OAuth callback' })
    async linkedinCallback(
        @Query('code') code: string,
        @Query('error') error: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        if (error || !code) {
            return res.redirect(`${this.frontendUrl}/?auth_error=linkedin_denied`);
        }
        try {
            const s = await this.adminSettings.getSettings();
            const profile = await this.service.exchangeLinkedinCode(code, s, this.backendBase);
            const visitor = await this.service.findOrCreate('linkedin', profile);
            this.setCookie(res, this.service.issueToken(visitor));
            await this.service.logAuth(visitor, req.ip);
            return res.redirect(`${this.frontendUrl}/?visitor_login=1`);
        } catch {
            return res.redirect(`${this.frontendUrl}/?auth_error=linkedin_failed`);
        }
    }

    // ── Discord ───────────────────────────────────────────────────────────────

    @Get('discord')
    @ApiOperation({ summary: 'Redirect to Discord OAuth' })
    async discordLogin(@Res() res: Response) {
        const s = await this.adminSettings.getSettings();
        if (!s.visitorAuthEnabled || !s.discordOAuthEnabled || !s.discordClientId) {
            return res.redirect(`${this.frontendUrl}/?auth_error=provider_disabled`);
        }
        return res.redirect(this.service.buildDiscordAuthUrl(s, this.backendBase));
    }

    @Get('discord/callback')
    @ApiOperation({ summary: 'Discord OAuth callback' })
    async discordCallback(
        @Query('code') code: string,
        @Query('error') error: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        if (error || !code) {
            return res.redirect(`${this.frontendUrl}/?auth_error=discord_denied`);
        }
        try {
            const s = await this.adminSettings.getSettings();
            const profile = await this.service.exchangeDiscordCode(code, s, this.backendBase);
            const visitor = await this.service.findOrCreate('discord', profile);
            this.setCookie(res, this.service.issueToken(visitor));
            await this.service.logAuth(visitor, req.ip);
            return res.redirect(`${this.frontendUrl}/?visitor_login=1`);
        } catch {
            return res.redirect(`${this.frontendUrl}/?auth_error=discord_failed`);
        }
    }
}
