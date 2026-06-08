import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get('deployment')
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @ApiOperation({ summary: 'Get deployment health overview: GitHub commits, Render status, integrations (admin only)' })
    getDeploymentOverview() {
        return this.healthService.getDeploymentOverview();
    }
}
