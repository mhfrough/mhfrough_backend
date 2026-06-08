import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WidgetCache } from '../widgets/widget-cache.entity';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([WidgetCache]),
        AdminSettingsModule,
        ConfigModule,
    ],
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule { }
