import { Injectable } from '@nestjs/common';

const PREFIX = 'jwt:blocklist:';

@Injectable()
export class TokenBlocklistService {
    private readonly store = new Map<string, number>(); // key → expiry ms

    async block(jti: string, ttlSeconds: number): Promise<void> {
        if (ttlSeconds <= 0) return;
        const key = `${PREFIX}${jti}`;
        this.store.set(key, Date.now() + ttlSeconds * 1000);
        setTimeout(() => this.store.delete(key), ttlSeconds * 1000);
    }

    async isBlocked(jti: string): Promise<boolean> {
        const expiresAt = this.store.get(`${PREFIX}${jti}`);
        if (!expiresAt) return false;
        if (Date.now() > expiresAt) {
            this.store.delete(`${PREFIX}${jti}`);
            return false;
        }
        return true;
    }
}
