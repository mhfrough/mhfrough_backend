import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { Inquiry } from '../inquiries/inquiry.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Invoice } from '../invoices/invoice.entity';
import { ChatSession } from '../chat/chat-session.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Lead, Inquiry, Appointment, Invoice, ChatSession]),
        ActivityLogModule,
        EventsModule,
    ],
    providers: [LeadsService],
    controllers: [LeadsController],
    exports: [LeadsService],
})
export class LeadsModule { }
