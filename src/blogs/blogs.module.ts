import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blog } from './blog.entity';
import { BlogsService } from './blogs.service';
import { BlogsController } from './blogs.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EventsModule } from '../events/events.module';
import { SupabaseStorageModule } from '../supabase-storage/supabase-storage.module';
import { FcmModule } from '../fcm/fcm.module';

@Module({
    imports: [TypeOrmModule.forFeature([Blog]), ActivityLogModule, EventsModule, SupabaseStorageModule, FcmModule],
    providers: [BlogsService],
    controllers: [BlogsController],
    exports: [BlogsService],
})
export class BlogsModule { }
