import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WidgetsService } from './widgets.service';

@ApiTags('Widgets')
@Controller('widgets')
export class WidgetsController {
    constructor(private readonly widgetsService: WidgetsService) {}

    // ── Public data endpoints (data only, no keys exposed) ───────────────────

    @Get('weather')
    @ApiOperation({ summary: 'Get current weather data (cached)' })
    getWeather() {
        return this.widgetsService.getWeather();
    }

    @Get('gold')
    @ApiOperation({ summary: 'Get gold price per tola in PKR (cached)' })
    getGold() {
        return this.widgetsService.getGold();
    }

    @Get('usd-pkr')
    @ApiOperation({ summary: 'Get USD→PKR rate (cached)' })
    getUsdPkr() {
        return this.widgetsService.getUsdPkr();
    }

    // ── Admin: key configuration status ──────────────────────────────────────

    @Get('config')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get widget key configuration status (admin only)' })
    getConfig() {
        return this.widgetsService.getWidgetConfig();
    }
}
