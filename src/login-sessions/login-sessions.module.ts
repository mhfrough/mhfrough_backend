import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginSession } from './login-session.entity';
import { LoginSessionsService } from './login-sessions.service';

@Module({
    imports: [TypeOrmModule.forFeature([LoginSession])],
    providers: [LoginSessionsService],
    exports: [LoginSessionsService],
})
export class LoginSessionsModule { }
