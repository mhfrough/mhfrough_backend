import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickerMessage } from './ticker-message.entity';
import { TickerService } from './ticker.service';
import { TickerController } from './ticker.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
    imports: [TypeOrmModule.forFeature([TickerMessage]), ActivityLogModule],
    providers: [TickerService],
    controllers: [TickerController],
    exports: [TickerService],
})
export class TickerModule { }
