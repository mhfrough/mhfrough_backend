import { Module } from '@nestjs/common';
import { AdminDataController } from './admin-data.controller';
import { AdminDataService } from './admin-data.service';
import { UsersModule } from '../users/users.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

/**
 * Danger-zone data management: export + guarded selective wipe. Uses the global
 * TypeORM DataSource for table access; UsersService re-verifies the admin
 * password and ActivityLogService records every destructive action.
 */
@Module({
    imports: [UsersModule, ActivityLogModule],
    controllers: [AdminDataController],
    providers: [AdminDataService],
})
export class AdminDataModule { }
