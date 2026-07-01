import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QrDto {
    @ApiProperty({ example: 'https://mhfrough.dev', maxLength: 4096 })
    @IsString()
    @MaxLength(4096)
    text: string;

    @ApiPropertyOptional({ description: 'Pixel width of the output (default 256).', example: 256 })
    @IsOptional()
    @IsInt()
    size?: number;

    @ApiPropertyOptional({ description: 'Quiet-zone margin in modules (default 2).', example: 2 })
    @IsOptional()
    @IsInt()
    margin?: number;

    @ApiPropertyOptional({ description: 'Foreground colour (hex).', example: '#000000' })
    @IsOptional()
    @IsString()
    dark?: string;

    @ApiPropertyOptional({ description: 'Background colour (hex).', example: '#ffffff' })
    @IsOptional()
    @IsString()
    light?: string;

    @ApiPropertyOptional({ enum: ['L', 'M', 'Q', 'H'], description: 'Error-correction level.', example: 'M' })
    @IsOptional()
    @IsIn(['L', 'M', 'Q', 'H'])
    ecLevel?: 'L' | 'M' | 'Q' | 'H';

    @ApiPropertyOptional({ enum: ['png', 'svg'], description: 'Output format.', example: 'png' })
    @IsOptional()
    @IsIn(['png', 'svg'])
    format?: 'png' | 'svg';
}
