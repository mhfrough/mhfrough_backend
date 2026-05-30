import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WidgetCache } from './widget-cache.entity';
import { WidgetsService } from './widgets.service';
import { WidgetsController } from './widgets.controller';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([WidgetCache]),
        AdminSettingsModule,
    ],
    controllers: [WidgetsController],
    providers: [WidgetsService],
})
export class WidgetsModule {}
