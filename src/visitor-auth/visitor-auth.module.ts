import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VisitorUser } from './visitor-user.entity';
import { VisitorAuthService } from './visitor-auth.service';
import { VisitorAuthController } from './visitor-auth.controller';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([VisitorUser]),
        AdminSettingsModule,
        ActivityLogModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('VISITOR_JWT_SECRET') ?? config.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '30d' },
            }),
        }),
    ],
    controllers: [VisitorAuthController],
    providers: [VisitorAuthService],
    exports: [VisitorAuthService],
})
export class VisitorAuthModule { }
