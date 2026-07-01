import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportUsageDto {
    @ApiProperty({ example: 'rem-px' })
    @IsString()
    @MaxLength(60)
    toolId: string;

    @ApiPropertyOptional({ example: 'px-to-rem' })
    @IsOptional()
    @IsString()
    @MaxLength(60)
    action?: string;

    @ApiPropertyOptional({ example: { count: 3 } })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
