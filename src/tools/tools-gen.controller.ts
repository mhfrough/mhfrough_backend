import { Controller, Post, Body, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ToolsGenService } from './tools-gen.service';
import { QrDto } from './dto/qr.dto';
import { BarcodeDto } from './dto/barcode.dto';
import { JwtEncodeDto } from './dto/jwt-encode.dto';
import { PasswordHashDto } from './dto/password-hash.dto';
import { ScssNestDto } from './dto/scss-nest.dto';
import { PaletteDto } from './dto/palette.dto';
import { UrlDto } from './dto/url.dto';

@ApiTags('Tools — Generate')
@Controller('tools')
export class ToolsGenController {
    constructor(private readonly service: ToolsGenService) { }

    private clientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined;
        return forwarded?.split(',')[0]?.trim() ?? req.ip ?? '0.0.0.0';
    }

    private userAgent(req: Request): string {
        return (req.headers['user-agent'] ?? '').slice(0, 512);
    }

    @Post('qr')
    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Generate a QR code (PNG data URL or SVG)' })
    qr(@Body() dto: QrDto, @Req() req: Request) {
        return this.service.qr(dto, this.clientIp(req), this.userAgent(req));
    }

    @Post('barcode')
    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Generate a barcode (PNG data URL)' })
    barcode(@Body() dto: BarcodeDto, @Req() req: Request) {
        return this.service.barcode(dto, this.clientIp(req), this.userAgent(req));
    }

    @Post('jwt/encode')
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: 'Sign a JWT from a payload + secret' })
    jwtEncode(@Body() dto: JwtEncodeDto, @Req() req: Request) {
        return this.service.jwtEncode(dto, this.clientIp(req), this.userAgent(req));
    }

    @Post('password/hash')
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: 'Hash a password (bcrypt / md5 / sha1 / sha256 / sha512)' })
    passwordHash(@Body() dto: PasswordHashDto, @Req() req: Request) {
        return this.service.passwordHash(dto, this.clientIp(req), this.userAgent(req));
    }

    @Post('scss-nest')
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: 'Convert flat CSS into nested SCSS (best-effort)' })
    scssNest(@Body() dto: ScssNestDto, @Req() req: Request) {
        return this.service.scssNest(dto, this.clientIp(req), this.userAgent(req));
    }

    @Post('palette')
    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @ApiOperation({ summary: 'Generate a colour palette from a base colour + scheme' })
    palette(@Body() dto: PaletteDto, @Req() req: Request) {
        return this.service.palette(dto, this.clientIp(req), this.userAgent(req));
    }

    @Post('extract')
    @Throttle({ default: { limit: 15, ttl: 60000 } })
    @ApiOperation({ summary: 'Extract colours, fonts and meta from a web page' })
    extract(@Body() dto: UrlDto, @Req() req: Request) {
        return this.service.extract(dto.url, this.clientIp(req), this.userAgent(req));
    }

    @Post('seo')
    @Throttle({ default: { limit: 15, ttl: 60000 } })
    @ApiOperation({ summary: 'Audit a web page for basic SEO signals' })
    seo(@Body() dto: UrlDto, @Req() req: Request) {
        return this.service.seo(dto.url, this.clientIp(req), this.userAgent(req));
    }
}
