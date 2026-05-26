import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FcmToken } from './fcm-token.entity';
import { PushNotificationLog } from './push-notification-log.entity';
import { FcmService } from './fcm.service';
import { FcmController } from './fcm.controller';

@Module({
    imports: [TypeOrmModule.forFeature([FcmToken, PushNotificationLog])],
    providers: [FcmService],
    controllers: [FcmController],
    exports: [FcmService],
})
export class FcmModule { }
