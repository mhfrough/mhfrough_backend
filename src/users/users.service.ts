import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

/** Default fallback; overridden dynamically by AdminSettings */
export const MAX_LOGIN_ATTEMPTS = 3;

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly repo: Repository<User>) { }

    findByEmail(email: string): Promise<User | null> {
        return this.repo.findOne({ where: { email } });
    }

    findById(id: string): Promise<User | null> {
        return this.repo.findOne({ where: { id } });
    }

    create(email: string, passwordHash: string): Promise<User> {
        const user = this.repo.create({ email, passwordHash });
        return this.repo.save(user);
    }

    async recordFailedLogin(
        userId: string,
        maxAttempts = MAX_LOGIN_ATTEMPTS,
        lockDurationMinutes = 180,
    ): Promise<User> {
        const user = await this.repo.findOneOrFail({ where: { id: userId } });
        user.loginAttempts += 1;
        if (user.loginAttempts >= maxAttempts) {
            user.lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
        }
        return this.repo.save(user);
    }

    async resetLoginAttempts(userId: string): Promise<void> {
        await this.repo.update(userId, { loginAttempts: 0, lockedUntil: null });
    }

    async unlockByEmail(email: string): Promise<User | null> {
        const user = await this.repo.findOne({ where: { email } });
        if (!user) return null;
        user.loginAttempts = 0;
        user.lockedUntil = null;
        return this.repo.save(user);
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.repo.findOneOrFail({ where: { id: userId } });
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) throw new UnauthorizedException('Current password is incorrect');
        const hash = await bcrypt.hash(newPassword, 12);
        await this.repo.update(userId, { passwordHash: hash });
    }

    async updateProfile(userId: string, data: Partial<Pick<User,
        'displayName' | 'bio' | 'aboutHtml' | 'avatarUrl' | 'contactEmail' | 'phone' | 'location' |
        'timezone' | 'website' | 'github' | 'linkedin' | 'twitter' |
        'instagram' | 'youtube' | 'discord' | 'stackoverflow' | 'medium' | 'dribbble' | 'socialVisibility'>>): Promise<User> {
        await this.repo.update(userId, data as any);
        return this.repo.findOneOrFail({ where: { id: userId } });
    }
}
