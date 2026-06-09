import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_PUB = 'REDIS_PUB';
export const REDIS_SUB = 'REDIS_SUB';

@Global()
@Module({
    providers: [
        {
            provide: REDIS_PUB,
            inject: [ConfigService],
            useFactory: (config: ConfigService) =>
                new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
                    lazyConnect: true,
                    enableOfflineQueue: false,
                    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 3000)),
                }),
        },
        {
            provide: REDIS_SUB,
            inject: [ConfigService],
            useFactory: (config: ConfigService) =>
                new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
                    lazyConnect: true,
                    enableOfflineQueue: false,
                    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 3000)),
                }),
        },
    ],
    exports: [REDIS_PUB, REDIS_SUB],
})
export class RedisModule {}
