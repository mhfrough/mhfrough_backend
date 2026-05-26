import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './inquiry.entity';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './inquiries.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { FcmModule } from '../fcm/fcm.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [TypeOrmModule.forFeature([Inquiry]), NotificationsModule, FcmModule, EventsModule],
    providers: [InquiriesService],
    controllers: [InquiriesController],
    exports: [InquiriesService],
})
export class InquiriesModule { }
