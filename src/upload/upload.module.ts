import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { SupabaseStorageModule } from '../supabase-storage/supabase-storage.module';

@Module({
    imports: [ActivityLogModule, SupabaseStorageModule],
    controllers: [UploadController],
})
export class UploadModule { }
