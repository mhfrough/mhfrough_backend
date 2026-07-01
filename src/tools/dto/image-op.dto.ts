import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Body fields for the image tools. These arrive as multipart/form-data fields
 * alongside the uploaded `file`, so every value reaches the controller as a
 * string. Validation here is intentionally light — the controller coerces the
 * raw strings to numbers/enums itself. These DTOs exist mainly to document the
 * Swagger shape.
 */
export class ImageCompressDto {
    @ApiPropertyOptional({ description: 'Output quality 1-100 (default 80).', example: '80' })
    @IsOptional()
    @IsString()
    quality?: string;
}

export class ImageConvertDto {
    @ApiPropertyOptional({ enum: ['jpeg', 'png', 'webp', 'avif', 'gif'], example: 'webp' })
    @IsOptional()
    @IsIn(['jpeg', 'png', 'webp', 'avif', 'gif'])
    format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';

    @ApiPropertyOptional({ description: 'Output quality 1-100 (default 80).', example: '80' })
    @IsOptional()
    @IsString()
    quality?: string;
}

export class ImageUpscaleDto {
    @ApiPropertyOptional({ enum: ['2', '3', '4'], example: '2' })
    @IsOptional()
    @IsIn(['2', '3', '4'])
    scale?: string;
}

export class ImagePaletteDto {
    @ApiPropertyOptional({ description: 'Number of swatches to extract (default 6).', example: '6' })
    @IsOptional()
    @IsString()
    count?: string;
}

/** Shape returned by every byte-producing image operation. */
export interface ImageResult {
    /** data: URL of the produced image. */
    output: string;
    /** Output container format, e.g. 'jpeg', 'webp', 'png', 'ico'. */
    format: string;
    bytesIn: number;
    bytesOut: number;
    savedBytes: number;
    /** Percentage of bytes saved vs. input, rounded to 2 dp (can be negative). */
    savedPct: number;
    width: number;
    height: number;
    durationMs: number;
}

/** A single dominant colour extracted by the palette tool. */
export interface PaletteColor {
    hex: string;
    r: number;
    g: number;
    b: number;
    population: number;
}

export interface PaletteResult {
    colors: PaletteColor[];
}
