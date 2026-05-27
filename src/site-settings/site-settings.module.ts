import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSettings } from '../admin-settings/admin-settings.entity';
import { User } from '../users/user.entity';
import { SiteSettingsController } from './site-settings.controller';

@Module({
    imports: [TypeOrmModule.forFeature([AdminSettings, User])],
    controllers: [SiteSettingsController],
})
export class SiteSettingsModule { }
