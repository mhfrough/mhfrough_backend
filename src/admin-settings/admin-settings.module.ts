import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSettings } from './admin-settings.entity';
import { AdminSettingsService } from './admin-settings.service';
import { AdminSettingsController } from './admin-settings.controller';
import { LoginSessionsModule } from '../login-sessions/login-sessions.module';
import { UsersModule } from '../users/users.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AdminSettings]),
        LoginSessionsModule,
        UsersModule,
        ActivityLogModule,
    ],
    controllers: [AdminSettingsController],
    providers: [AdminSettingsService],
    exports: [AdminSettingsService],
})
export class AdminSettingsModule { }
