import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
    imports: [ActivityLogModule],
    controllers: [UploadController],
})
export class UploadModule { }
