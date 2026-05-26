import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from './feedback.entity';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { FcmModule } from '../fcm/fcm.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [TypeOrmModule.forFeature([Feedback]), NotificationsModule, FcmModule, EventsModule],
    providers: [FeedbackService],
    controllers: [FeedbackController],
    exports: [FeedbackService],
})
export class FeedbackModule { }
