import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './activity-log.entity';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogController } from './activity-log.controller';
import { EventsModule } from '../events/events.module';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([ActivityLog]), EventsModule],
    providers: [ActivityLogService],
    controllers: [ActivityLogController],
    exports: [ActivityLogService],
})
export class ActivityLogModule { }
