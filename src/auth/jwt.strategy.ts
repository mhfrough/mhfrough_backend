import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginSessionsService } from '../login-sessions/login-sessions.service';

const cookieExtractor = (req: Request): string | null => {
    return req?.cookies?.access_token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly config: ConfigService,
        private readonly usersService: UsersService,
        private readonly loginSessions: LoginSessionsService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                cookieExtractor,
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: config.get<string>('JWT_SECRET') as string,
        });
    }

    async validate(payload: { sub: string; email: string; role: string; sid?: string }) {
        const user = await this.usersService.findById(payload.sub);
        if (!user || !user.isActive) return null;
        if (payload.sid) {
            const session = await this.loginSessions.findActiveById(payload.sid);
            if (!session) return null;
        }
        return { ...user, sessionId: payload.sid };
    }
}
