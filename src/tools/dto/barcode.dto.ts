import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BarcodeDto {
    @ApiProperty({ example: '012345678905', maxLength: 4096 })
    @IsString()
    @MaxLength(4096)
    text: string;

    @ApiPropertyOptional({ description: 'bwip-js barcode type (bcid), default code128.', example: 'code128' })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiPropertyOptional({ description: 'Module scale factor (default 3).', example: 3 })
    @IsOptional()
    @IsInt()
    scale?: number;

    @ApiPropertyOptional({ description: 'Bar height in millimetres (default 10).', example: 10 })
    @IsOptional()
    @IsInt()
    height?: number;

    @ApiPropertyOptional({ description: 'Render the human-readable text (default true).', example: true })
    @IsOptional()
    @IsBoolean()
    includetext?: boolean;
}
