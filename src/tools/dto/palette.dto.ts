import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PALETTE_SCHEMES = [
    'analogous',
    'complementary',
    'triadic',
    'tetradic',
    'monochromatic',
    'shades',
    'tints',
] as const;

export type PaletteScheme = (typeof PALETTE_SCHEMES)[number];

export class PaletteDto {
    @ApiProperty({ description: 'Base colour (any CSS colour chroma accepts).', example: '#3b82f6' })
    @IsString()
    base: string;

    @ApiProperty({ enum: PALETTE_SCHEMES, example: 'analogous' })
    @IsIn(PALETTE_SCHEMES as unknown as string[])
    scheme: PaletteScheme;

    @ApiPropertyOptional({ description: 'Number of colours to produce (default 6).', example: 6 })
    @IsOptional()
    @IsInt()
    count?: number;
}
