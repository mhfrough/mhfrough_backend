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

    // ── Widget API Keys ───────────────────────────────────────────────────────

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    weatherApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    goldApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    currencyApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    weatherCity?: string;

    // ── AI Chat Auto-Reply ─────────────────────────────────────────────────

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    geminiApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    aiEnabled?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(50)
    aiTone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    aiInstruction?: string;

    @ApiPropertyOptional({ minimum: 500, maximum: 10000 })
    @IsOptional()
    @IsInt()
    @Min(500)
    @Max(10000)
    aiAutoReplyDelay?: number;

    @ApiPropertyOptional({ minimum: 100, maximum: 2000 })
    @IsOptional()
    @IsInt()
    @Min(100)
    @Max(2000)
    aiMaxResponseLength?: number;
}
