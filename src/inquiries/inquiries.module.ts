import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './inquiry.entity';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './inquiries.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [TypeOrmModule.forFeature([Inquiry]), NotificationsModule],
    providers: [InquiriesService],
    controllers: [InquiriesController],
    exports: [InquiriesService],
})
export class InquiriesModule { }
