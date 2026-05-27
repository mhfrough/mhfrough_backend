import { Injectable, UnauthorizedException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService, MAX_LOGIN_ATTEMPTS } from '../users/users.service';
import { User } from '../users/user.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly activityLog: ActivityLogService,
    ) { }

    async validateUser(email: string, password: string, ip = 'unknown'): Promise<User> {
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
        if (user.lockedUntil && user.lockedUntil > now) {
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
            const updated = await this.usersService.recordFailedLogin(user.id);

            if (updated.lockedUntil) {
                await this.activityLog.log({
                    action: 'auth:account_locked',
                    resource: 'auth',
                    description: `Account locked for 3 hours after ${updated.loginAttempts} failed attempts. Email: ${email}. IP: ${ip}.`,
                    status: 'error',
                    errorMessage: 'Too many failed login attempts',
                    metadata: { email, ip, loginAttempts: updated.loginAttempts, lockedUntil: updated.lockedUntil },
                });
                throw new HttpException(
                    {
                        statusCode: 423,
                        error: 'account_locked',
                        lockedUntil: updated.lockedUntil,
                        remainingMinutes: 180,
                        message: 'Too many failed attempts. Account locked for 3 hours.',
                    },
                    423,
                );
            }

            const attemptsLeft = MAX_LOGIN_ATTEMPTS - updated.loginAttempts;
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
                    warning: `Wrong password. ${attemptsLeft} attempt(s) remaining before a 3-hour lockout.`,
                },
                401,
            );
        }

        // Successful login — reset counter
        await this.usersService.resetLoginAttempts(user.id);
        return user;
    }

    async login(user: User, res: any): Promise<{ message: string }> {
        const payload = { sub: user.id, email: user.email, role: user.role };
        const token = this.jwtService.sign(payload);
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        this.activityLog.log({ action: 'auth:login', resource: 'auth', description: user.email, status: 'success' });
        return { message: 'Login successful' };
    }

    logout(res: any): { message: string } {
        res.clearCookie('access_token');
        return { message: 'Logged out' };
    }

    async profile(userId: string): Promise<Partial<User>> {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException();
        const { passwordHash: _, ...profile } = user;
        return profile;
    }
}
