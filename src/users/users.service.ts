import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export const MAX_LOGIN_ATTEMPTS = 3;
const LOCK_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

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

    async recordFailedLogin(userId: string): Promise<User> {
        const user = await this.repo.findOneOrFail({ where: { id: userId } });
        user.loginAttempts += 1;
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
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
}
