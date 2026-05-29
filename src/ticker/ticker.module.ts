import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickerMessage } from './ticker-message.entity';
import { TickerService } from './ticker.service';
import { TickerController } from './ticker.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [TypeOrmModule.forFeature([TickerMessage]), ActivityLogModule, EventsModule],
    providers: [TickerService],
    controllers: [TickerController],
    exports: [TickerService],
})
export class TickerModule { }
