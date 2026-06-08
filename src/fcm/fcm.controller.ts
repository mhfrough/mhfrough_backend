import {
    Controller, Post, Delete, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FcmService } from './fcm.service';
import { RegisterFcmTokenDto, UnregisterFcmTokenDto } from './dto/fcm.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('FCM')
@Controller('fcm')
export class FcmController {
    constructor(private readonly fcm: FcmService) { }

    @Post('register')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: 'Register a browser FCM token' })
    async register(@Body() dto: RegisterFcmTokenDto): Promise<void> {
        await this.fcm.registerToken(dto.token, dto.platform ?? 'web');
    }

    @Delete('unregister')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: 'Unregister a browser FCM token' })
    async unregister(@Body() dto: UnregisterFcmTokenDto): Promise<void> {
        await this.fcm.unregisterToken(dto.token);
    }
}
