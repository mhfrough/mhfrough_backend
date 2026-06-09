import { Controller, Post, Body, Res, Get, UseGuards, Req, HttpCode, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(200)
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: 'Admin login' })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
        const userAgent = req.headers['user-agent'] as string | undefined;
        const user = await this.authService.validateUser(dto.email, dto.password, ip);
        return this.authService.login(user, res, { rememberMe: dto.rememberMe ?? false, userAgent, ip });
    }

    @Post('logout')
    @HttpCode(200)
    @ApiOperation({ summary: 'Logout and clear cookie' })
    logout(@Res({ passthrough: true }) res: Response, @Req() req: Request & { user?: any }) {
        const sessionId = req.user?.sessionId as string | undefined;
        const rawToken = req.cookies?.access_token as string | undefined;
        return this.authService.logout(res, sessionId, rawToken);
    }

    @Get('profile')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get logged-in admin profile' })
    profile(@Req() req: Request & { user: any }) {
        return this.authService.profile(req.user.id);
    }

    @Post('unlock-account')
    @HttpCode(200)
    @Throttle({ default: { ttl: 3_600_000, limit: 3 } })
    @ApiOperation({ summary: 'Unlock admin account (requires X-Unlock-Secret header)' })
    unlockAccount(
        @Headers('x-unlock-secret') secret: string,
        @Req() req: Request,
    ) {
        const ip =
            ((req.headers as Record<string, string>)['x-forwarded-for'])
                ?.split(',')[0]?.trim() ?? (req as any).ip ?? 'unknown';
        return this.authService.unlockAccount(secret ?? '', ip);
    }
}
