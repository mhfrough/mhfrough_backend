import { Injectable, UnauthorizedException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { LoginSessionsService } from '../login-sessions/login-sessions.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly activityLog: ActivityLogService,
        private readonly adminSettings: AdminSettingsService,
        private readonly loginSessions: LoginSessionsService,
    ) { }

    async validateUser(email: string, password: string, ip = 'unknown'): Promise<User> {
        const settings = await this.adminSettings.getSettings();
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.isActive) {
            await this.activityLog.log({
                action: 'auth:login_failed',
                resource: 'auth',
                description: `Login attempt for unknown account: ${email}`,
                status: 'error',
                errorMessage: 'Account not found or inactive',
                metadata: { email, ip },
            });
            throw new UnauthorizedException('Invalid credentials');
        }

        const now = new Date();

        // Account is currently locked
        if (settings.enableLoginAttemptSuspend && user.lockedUntil && user.lockedUntil > now) {
            const remainingMs = user.lockedUntil.getTime() - now.getTime();
            const remainingMinutes = Math.ceil(remainingMs / 60000);
            await this.activityLog.log({
                action: 'auth:login_blocked',
                resource: 'auth',
                description: `Login blocked — account locked (${email}). IP: ${ip}. Unlocks in ${remainingMinutes} min.`,
                status: 'error',
                errorMessage: 'Account is locked',
                metadata: { email, ip, remainingMinutes, lockedUntil: user.lockedUntil },
            });
            throw new HttpException(
                {
                    statusCode: 423,
                    error: 'account_locked',
                    lockedUntil: user.lockedUntil,
                    remainingMinutes,
                    message: `Account is locked. Try again in ${remainingMinutes} minute(s).`,
                },
                423,
            );
        }

        // Lock expired — auto-clear
        if (user.lockedUntil && user.lockedUntil <= now) {
            await this.usersService.resetLoginAttempts(user.id);
            user.loginAttempts = 0;
            user.lockedUntil = null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            if (!settings.enableLoginAttemptSuspend) {
                await this.activityLog.log({
                    action: 'auth:login_failed',
                    resource: 'auth',
                    description: `Wrong password for ${email}. IP: ${ip}. (lockout disabled)`,
                    status: 'error',
                    errorMessage: 'Invalid password',
                    metadata: { email, ip },
                });
                throw new HttpException(
                    { statusCode: 401, error: 'invalid_credentials', warning: 'Wrong password.' },
                    401,
                );
            }

            const updated = await this.usersService.recordFailedLogin(
                user.id,
                settings.maxLoginAttempts,
                settings.lockDurationMinutes,
            );

            if (updated.lockedUntil) {
                await this.activityLog.log({
                    action: 'auth:account_locked',
                    resource: 'auth',
                    description: `Account locked for ${settings.lockDurationMinutes} min after ${updated.loginAttempts} failed attempts. Email: ${email}. IP: ${ip}.`,
                    status: 'error',
                    errorMessage: 'Too many failed login attempts',
                    metadata: { email, ip, loginAttempts: updated.loginAttempts, lockedUntil: updated.lockedUntil },
                });
                throw new HttpException(
                    {
                        statusCode: 423,
                        error: 'account_locked',
                        lockedUntil: updated.lockedUntil,
                        remainingMinutes: settings.lockDurationMinutes,
                        message: `Too many failed attempts. Account locked for ${settings.lockDurationMinutes} minute(s).`,
                    },
                    423,
                );
            }

            const attemptsLeft = settings.maxLoginAttempts - updated.loginAttempts;
            await this.activityLog.log({
                action: 'auth:login_failed',
                resource: 'auth',
                description: `Wrong password for ${email}. IP: ${ip}. ${attemptsLeft} attempt(s) left before lockout.`,
                status: 'error',
                errorMessage: 'Invalid password',
                metadata: { email, ip, loginAttempts: updated.loginAttempts, attemptsLeft },
            });
            throw new HttpException(
                {
                    statusCode: 401,
                    error: 'invalid_credentials',
                    attemptsLeft,
                    warning: `Wrong password. ${attemptsLeft} attempt(s) remaining before a ${settings.lockDurationMinutes}-minute lockout.`,
                },
                401,
            );
        }

        // Successful login — reset counter
        await this.usersService.resetLoginAttempts(user.id);
        return user;
    }

    async login(
        user: User,
        res: any,
        options: { rememberMe?: boolean; userAgent?: string; ip?: string } = {},
    ): Promise<{ message: string }> {
        const settings = await this.adminSettings.getSettings();
        const { rememberMe = false, userAgent, ip = 'unknown' } = options;

        const session = await this.loginSessions.create({ userId: user.id, ip, userAgent });

        const cookieMaxAgeDays = rememberMe ? settings.rememberMeDays : settings.sessionDurationDays;
        const payload = { sub: user.id, email: user.email, role: user.role, sid: session.id };
        const token = this.jwtService.sign(payload, { expiresIn: `${cookieMaxAgeDays}d` });

        const cookieOptions: Record<string, unknown> = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        };
        if (rememberMe) {
            cookieOptions.maxAge = cookieMaxAgeDays * 24 * 60 * 60 * 1000;
        }

        res.cookie('access_token', token, cookieOptions);
        res.cookie('admin_rm', rememberMe ? '1' : '0', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            ...(rememberMe ? { maxAge: cookieMaxAgeDays * 24 * 60 * 60 * 1000 } : {}),
        });

        this.activityLog.log({
            action: 'auth:login',
            resource: 'auth',
            description: `${user.email} logged in from ${ip}. rememberMe=${rememberMe}`,
            status: 'success',
            metadata: { ip, userAgent, rememberMe, sessionId: session.id },
        });
        return { message: 'Login successful' };
    }

    async logout(res: any, sessionId?: string): Promise<{ message: string }> {
        if (sessionId) {
            await this.loginSessions.revoke(sessionId);
        }
        res.clearCookie('access_token');
        res.clearCookie('admin_rm');
        return { message: 'Logged out' };
    }

    async profile(userId: string): Promise<Partial<User>> {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException();
        const { passwordHash: _, ...profile } = user;
        return profile;
    }
}
