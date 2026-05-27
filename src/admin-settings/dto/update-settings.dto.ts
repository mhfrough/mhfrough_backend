import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    enableInactivityLogout?: boolean;

    @ApiPropertyOptional({ minimum: 1, maximum: 480 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(480)
    inactivityTimeoutMinutes?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    enableLoginAttemptSuspend?: boolean;

    @ApiPropertyOptional({ minimum: 1, maximum: 20 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    maxLoginAttempts?: number;

    @ApiPropertyOptional({ minimum: 5, maximum: 1440 })
    @IsOptional()
    @IsInt()
    @Min(5)
    @Max(1440)
    lockDurationMinutes?: number;

    @ApiPropertyOptional({ minimum: 1, maximum: 365 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(365)
    rememberMeDays?: number;

    @ApiPropertyOptional({ minimum: 1, maximum: 30 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(30)
    sessionDurationDays?: number;

    // ── Footer / Branding ──────────────────────────────────────────────────────

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(120)
    copyrightOwner?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    footerTagline?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    showFooterTagline?: boolean;
}
