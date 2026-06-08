import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '../gallery-item.entity';

export class CreateGalleryItemDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    caption?: string;

    @ApiProperty()
    @IsString()
    mediaUrl: string;

    @ApiPropertyOptional({ enum: MediaType, default: MediaType.IMAGE })
    @IsOptional()
    @IsEnum(MediaType)
    mediaType?: MediaType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    altText?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    mimeType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    fileSize?: number;
}

export class UpdateGalleryItemDto extends CreateGalleryItemDto { }
