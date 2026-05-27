import { Controller, Post, Body, Res, Get, UseGuards, Req, HttpCode } from '@nestjs/common';
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
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @ApiOperation({ summary: 'Admin login' })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
        const user = await this.authService.validateUser(dto.email, dto.password, ip);
        return this.authService.login(user, res);
    }

    @Post('logout')
    @HttpCode(200)
    @ApiOperation({ summary: 'Logout and clear cookie' })
    logout(@Res({ passthrough: true }) res: Response) {
        return this.authService.logout(res);
    }

    @Get('profile')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get logged-in admin profile' })
    profile(@Req() req: Request & { user: any }) {
        return this.authService.profile(req.user.id);
    }
}
