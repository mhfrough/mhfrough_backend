import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, MinLength, IsDateString } from 'class-validator';

export class CreateTickerMessageDto {
    @ApiProperty({ description: 'Ticker message text', maxLength: 500 })
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    message: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @ApiPropertyOptional({ description: 'Date/time after which the ticker auto-unpublishes' })
    @IsOptional()
    @IsDateString()
    autoDeactivateAt?: string;
}

export class UpdateTickerMessageDto {
    @ApiPropertyOptional({ maxLength: 500 })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    message?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @ApiPropertyOptional({ description: 'Date/time after which the ticker auto-unpublishes' })
    @IsOptional()
    @IsDateString()
    autoDeactivateAt?: string | null;
}
