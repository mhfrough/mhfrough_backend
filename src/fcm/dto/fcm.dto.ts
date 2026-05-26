import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterFcmTokenDto {
    @ApiProperty({ description: 'FCM registration token' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiPropertyOptional({ description: 'Platform (web, android, ios)' })
    @IsString()
    @IsOptional()
    @IsIn(['web', 'android', 'ios'])
    platform?: string;
}

export class UnregisterFcmTokenDto {
    @ApiProperty({ description: 'FCM registration token to remove' })
    @IsString()
    @IsNotEmpty()
    token: string;
}

export class SendPushNotificationDto {
    @ApiProperty({ description: 'Notification title' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: 'Notification body text' })
    @IsString()
    @IsNotEmpty()
    body: string;

    @ApiPropertyOptional({ description: 'Click URL for the notification' })
    @IsString()
    @IsOptional()
    url?: string;
}
