import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginSession } from './login-session.entity';
import { LoginSessionsService } from './login-sessions.service';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [TypeOrmModule.forFeature([LoginSession]), EventsModule],
    providers: [LoginSessionsService],
    exports: [LoginSessionsService],
})
export class LoginSessionsModule { }
