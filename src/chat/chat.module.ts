import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatSession } from './chat-session.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatSetting } from './chat-setting.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { FcmModule } from '../fcm/fcm.module';
import { AiModule } from '../ai/ai.module';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { SupabaseStorageModule } from '../supabase-storage/supabase-storage.module';
import { LeadsModule } from '../leads/leads.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { WidgetsModule } from '../widgets/widgets.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatSession, ChatMessage, ChatSetting]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET'),
            }),
        }),
        FcmModule,
        AiModule,
        AdminSettingsModule,
        SupabaseStorageModule,
        LeadsModule,
        AppointmentsModule,
        InvoicesModule,
        WidgetsModule,
    ],
    providers: [ChatService, ChatGateway],
    controllers: [ChatController],
    exports: [ChatService, ChatGateway],
})
export class ChatModule { }
