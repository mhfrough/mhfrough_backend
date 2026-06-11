import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailMessage } from './email-message.entity';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';

@Module({
    imports: [TypeOrmModule.forFeature([EmailMessage]), AdminSettingsModule],
    controllers: [EmailController],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule { }
