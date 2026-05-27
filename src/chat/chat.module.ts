import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './chat-session.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatSetting } from './chat-setting.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { FcmModule } from '../fcm/fcm.module';

@Module({
    imports: [TypeOrmModule.forFeature([ChatSession, ChatMessage, ChatSetting]), FcmModule],
    providers: [ChatService, ChatGateway],
    controllers: [ChatController],
    exports: [ChatService, ChatGateway],
})
export class ChatModule { }
