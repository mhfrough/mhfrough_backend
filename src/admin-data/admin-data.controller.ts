import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminDataService } from './admin-data.service';
import { WipeDataDto } from './dto/wipe-data.dto';

@ApiTags('Admin Data')
@Controller('admin/data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminDataController {
    constructor(private readonly adminData: AdminDataService) { }

    @Get('datasets')
    @ApiOperation({ summary: 'List clearable/exportable datasets with live row counts' })
    datasets() {
        return this.adminData.listDatasets();
    }

    @Get('export')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: 'Download a full JSON snapshot of all content datasets' })
    export() {
        return this.adminData.export();
    }

    @Post('wipe')
    @HttpCode(200)
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: 'Irreversibly clear selected datasets (password + phrase required)' })
    wipe(@Req() req: any, @Body() dto: WipeDataDto) {
        return this.adminData.wipe(req.user.id, dto.password, dto.confirm, dto.datasets);
    }
}
