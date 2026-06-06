import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FcmModule } from '../fcm/fcm.module';
import { SupabaseStorageModule } from '../supabase-storage/supabase-storage.module';

@Module({
    imports: [TypeOrmModule.forFeature([Project]), EventsModule, NotificationsModule, FcmModule, SupabaseStorageModule],
    providers: [ProjectsService],
    controllers: [ProjectsController],
    exports: [ProjectsService],
})
export class ProjectsModule { }
