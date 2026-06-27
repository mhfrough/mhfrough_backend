import {
    Controller,
    Get,
    Patch,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
    HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminSettingsService } from './admin-settings.service';
import { LoginSessionsService } from '../login-sessions/login-sessions.service';
import { UsersService } from '../users/users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EventsGateway } from '../events/events.gateway';

const AI_FIELDS = new Set(['aiEnabled', 'aiTone', 'aiInstruction', 'aiAutoReplyDelay', 'aiMaxResponseLength', 'aiMaxQuestions', 'geminiApiKey']);
const SECURITY_FIELDS = new Set(['enableInactivityLogout', 'inactivityTimeoutMinutes', 'enableLoginAttemptSuspend', 'maxLoginAttempts', 'lockDurationMinutes', 'rememberMeDays', 'sessionDurationDays']);
const WIDGET_FIELDS = new Set(['weatherApiKey', 'goldApiKey', 'currencyApiKey', 'weatherCity']);
const BRANDING_FIELDS = new Set(['copyrightOwner', 'footerTagline', 'showFooterTagline']);
const EMAIL_FIELDS = new Set(['resendApiKey', 'emailFromAddress', 'emailFromName', 'emailEnabled']);
const OAUTH_FIELDS = new Set(['visitorAuthEnabled', 'googleOAuthEnabled', 'googleClientId', 'googleClientSecret', 'githubOAuthEnabled', 'githubClientId', 'githubClientSecret', 'linkedinOAuthEnabled', 'linkedinClientId', 'linkedinClientSecret', 'discordOAuthEnabled', 'discordClientId', 'discordClientSecret']);

@ApiTags('Admin Settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminSettingsController {
    constructor(
        private readonly settingsService: AdminSettingsService,
        private readonly loginSessionsService: LoginSessionsService,
        private readonly usersService: UsersService,
        private readonly activityLog: ActivityLogService,
        private readonly events: EventsGateway,
    ) { }

    // ── Security Settings ────────────────────────────────────────────────────

    @Get()
    @ApiOperation({ summary: 'Get admin settings' })
    async getSettings() {
        const s = await this.settingsService.getSettings();
        return {
            ...s,
            weatherApiKey: s.weatherApiKey ? '••••••••' : null,
            goldApiKey: s.goldApiKey ? '••••••••' : null,
            currencyApiKey: s.currencyApiKey ? '••••••••' : null,
            geminiApiKey: s.geminiApiKey ? '••••••••' : null,
            resendApiKey: s.resendApiKey ? '••••••••' : null,
            googleClientSecret: s.googleClientSecret ? '••••••••' : null,
            githubClientSecret: s.githubClientSecret ? '••••••••' : null,
            linkedinClientSecret: s.linkedinClientSecret ? '••••••••' : null,
            discordClientSecret: s.discordClientSecret ? '••••••••' : null,
        };
    }

    @Patch()
    @ApiOperation({ summary: 'Update admin settings' })
    async updateSettings(@Body() dto: UpdateSettingsDto) {
        const result = await this.settingsService.updateSettings(dto);
        const changed = Object.keys(dto) as (keyof UpdateSettingsDto)[];

        // AI auto-reply toggle — highest priority, most specific log
        if ('aiEnabled' in dto) {
            this.activityLog.log({
                action: dto.aiEnabled ? 'settings:ai_autoreply_enabled' : 'settings:ai_autoreply_disabled',
                resource: 'admin_settings',
                description: `AI auto-reply ${dto.aiEnabled ? 'enabled' : 'disabled'}`,
                status: 'success',
            });
        }

        // Gemini API key saved or cleared
        if ('geminiApiKey' in dto) {
            this.activityLog.log({
                action: 'settings:gemini_key_updated',
                resource: 'admin_settings',
                description: dto.geminiApiKey ? 'Gemini API key saved' : 'Gemini API key cleared',
                status: 'success',
            });
        }

        // Other AI settings (tone, instruction, delay, length) — excluding the two above
        const otherAiChanged = changed.filter(k => AI_FIELDS.has(k) && k !== 'aiEnabled' && k !== 'geminiApiKey');
        if (otherAiChanged.length) {
            this.activityLog.log({
                action: 'settings:ai_config_updated',
                resource: 'admin_settings',
                description: `AI config updated: ${otherAiChanged.join(', ')}`,
                status: 'success',
                metadata: Object.fromEntries(otherAiChanged.map(k => [k, dto[k]])),
            });
        }

        // Security settings
        const securityChanged = changed.filter(k => SECURITY_FIELDS.has(k));
        if (securityChanged.length) {
            this.activityLog.log({
                action: 'settings:security_updated',
                resource: 'admin_settings',
                description: `Security settings updated: ${securityChanged.join(', ')}`,
                status: 'success',
                metadata: Object.fromEntries(securityChanged.map(k => [k, dto[k]])),
            });
        }

        // Widget API keys
        const widgetChanged = changed.filter(k => WIDGET_FIELDS.has(k));
        if (widgetChanged.length) {
            this.activityLog.log({
                action: 'settings:widget_keys_updated',
                resource: 'admin_settings',
                description: `Widget settings updated: ${widgetChanged.map(k => k === 'weatherCity' ? `weatherCity → ${dto.weatherCity}` : `${k} ${(dto as any)[k] ? 'set' : 'cleared'}`).join(', ')}`,
                status: 'success',
            });
        }

        // Footer / branding
        const brandingChanged = changed.filter(k => BRANDING_FIELDS.has(k));
        if (brandingChanged.length) {
            this.activityLog.log({
                action: 'settings:branding_updated',
                resource: 'admin_settings',
                description: `Branding updated: ${brandingChanged.join(', ')}`,
                status: 'success',
            });
        }

        // Resend API key saved or cleared
        if ('resendApiKey' in dto) {
            this.activityLog.log({
                action: 'settings:resend_key_updated',
                resource: 'admin_settings',
                description: dto.resendApiKey ? 'Resend API key saved' : 'Resend API key cleared',
                status: 'success',
            });
        }

        // Other email settings (from address/name, enabled toggle) — excluding the key above
        const otherEmailChanged = changed.filter(k => EMAIL_FIELDS.has(k) && k !== 'resendApiKey');
        if (otherEmailChanged.length) {
            this.activityLog.log({
                action: 'settings:email_config_updated',
                resource: 'admin_settings',
                description: `Email config updated: ${otherEmailChanged.join(', ')}`,
                status: 'success',
                metadata: Object.fromEntries(otherEmailChanged.map(k => [k, dto[k]])),
            });
        }

        // Visitor auth master toggle
        if ('visitorAuthEnabled' in dto) {
            this.activityLog.log({
                action: dto.visitorAuthEnabled ? 'settings:visitor_auth_enabled' : 'settings:visitor_auth_disabled',
                resource: 'admin_settings',
                description: `Visitor authentication ${dto.visitorAuthEnabled ? 'enabled' : 'disabled'}`,
                status: 'success',
            });
        }

        // OAuth provider secrets or toggles changed
        const oauthChanged = changed.filter(k => OAUTH_FIELDS.has(k) && k !== 'visitorAuthEnabled');
        if (oauthChanged.length) {
            this.activityLog.log({
                action: 'settings:oauth_updated',
                resource: 'admin_settings',
                description: `OAuth settings updated: ${oauthChanged.map(k => k.endsWith('Secret') ? `${k} ${(dto as any)[k] ? 'set' : 'cleared'}` : k).join(', ')}`,
                status: 'success',
            });
        }

        return result;
    }

    // ── Login Sessions ───────────────────────────────────────────────────────

    @Get('sessions')
    @ApiOperation({ summary: 'List all login sessions' })
    async getSessions(@Req() req: any) {
        const sessions = await this.loginSessionsService.findAll();
        return { sessions, currentSessionId: req.user?.sessionId ?? null };
    }

    @Delete('sessions/revoked')
    @HttpCode(200)
    @ApiOperation({ summary: 'Clear all revoked session history' })
    async clearRevokedSessions(@Req() req: any) {
        await this.loginSessionsService.clearRevoked(req.user.id);
        this.activityLog.log({
            action: 'settings:clear_session_history',
            resource: 'login_sessions',
            description: 'Revoked session history cleared',
            status: 'success',
        });
        return { message: 'Revoked sessions cleared' };
    }

    @Delete('sessions/all')
    @HttpCode(200)
    @ApiOperation({ summary: 'Revoke all other active sessions except current' })
    async revokeAllSessions(@Req() req: any) {
        const currentSessionId: string | undefined = req.user?.sessionId;
        if (currentSessionId) {
            await this.loginSessionsService.revokeAllExcept(req.user.id, currentSessionId);
        } else {
            await this.loginSessionsService.revokeAllForUser(req.user.id);
        }
        this.activityLog.log({
            action: 'settings:revoke_all_sessions',
            resource: 'login_sessions',
            description: 'All other login sessions revoked',
            status: 'success',
        });
        return { message: 'All other sessions revoked' };
    }

    @Delete('sessions/:id')
    @HttpCode(200)
    @ApiOperation({ summary: 'Revoke a specific login session (cannot revoke current)' })
    async revokeSession(@Req() req: any, @Param('id') id: string) {
        if (req.user?.sessionId === id) {
            return { message: 'Cannot revoke your current session.' };
        }
        await this.loginSessionsService.revoke(id);
        this.activityLog.log({
            action: 'settings:revoke_session',
            resource: 'login_sessions',
            description: `Session ${id} revoked`,
            status: 'success',
        });
        return { message: 'Session revoked' };
    }

    // ── Change Password ──────────────────────────────────────────────────────

    @Post('change-password')
    @HttpCode(200)
    @ApiOperation({ summary: 'Change admin password' })
    async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
        await this.usersService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
        await this.loginSessionsService.revokeAllForUser(req.user.id);
        this.activityLog.log({
            action: 'settings:password_changed',
            resource: 'auth',
            description: 'Admin password changed — all sessions revoked',
            status: 'success',
        });
        return { message: 'Password changed. Please log in again.' };
    }

    // ── Profile ──────────────────────────────────────────────────────────────

    @Get('profile')
    @ApiOperation({ summary: 'Get admin profile' })
    async getProfile(@Req() req: any) {
        const user = await this.usersService.findById(req.user.id);
        if (!user) return {};
        const { passwordHash: _, ...profile } = user;
        return profile;
    }

    @Patch('profile')
    @ApiOperation({ summary: 'Update admin profile' })
    async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
        const updated = await this.usersService.updateProfile(req.user.id, dto);
        const changed = Object.keys(dto).filter(k => k !== 'socialVisibility');
        const avatarChanged = 'avatarUrl' in dto;
        this.activityLog.log({
            action: avatarChanged ? 'settings:avatar_updated' : 'settings:profile_updated',
            resource: 'users',
            description: avatarChanged
                ? 'Profile avatar updated'
                : `Profile updated: ${changed.join(', ')}`,
            status: 'success',
        });
        const { passwordHash: _, ...profile } = updated;
        this.events.emitToAll('profile:updated', profile);
        return profile;
    }
}
