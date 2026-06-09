import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [TypeOrmModule.forFeature([Appointment]), ActivityLogModule, EventsModule],
    controllers: [AppointmentsController],
    providers: [AppointmentsService],
    exports: [AppointmentsService],
})
export class AppointmentsModule {}
