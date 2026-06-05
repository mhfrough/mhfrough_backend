import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { LoginSessionsModule } from '../login-sessions/login-sessions.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        UsersModule,
        ActivityLogModule,
        AdminSettingsModule,
        LoginSessionsModule,
        EventsModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '7d' },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
