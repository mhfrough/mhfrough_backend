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
            // Mask API keys — return boolean presence, not the actual value
            weatherApiKey: s.weatherApiKey ? '••••••••' : null,
            goldApiKey: s.goldApiKey ? '••••••••' : null,
            currencyApiKey: s.currencyApiKey ? '••••••••' : null,
        };
    }

    @Patch()
    @ApiOperation({ summary: 'Update admin settings' })
    async updateSettings(@Body() dto: UpdateSettingsDto) {
        const result = await this.settingsService.updateSettings(dto);
        this.activityLog.log({
            action: 'settings:security_updated',
            resource: 'admin_settings',
            description: 'Security settings updated',
            status: 'success',
        });
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
        this.activityLog.log({
            action: 'settings:profile_updated',
            resource: 'users',
            description: 'Admin profile updated',
            status: 'success',
        });
        const { passwordHash: _, ...profile } = updated;
        this.events.emitToAll('profile:updated', profile);
        return profile;
    }
}
