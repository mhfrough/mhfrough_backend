import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
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
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    altText?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    mimeType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    fileSize?: number;
}

export class UpdateGalleryItemDto extends CreateGalleryItemDto { }

export class ReorderGalleryDto {
    items: { id: string; sortOrder: number }[];
}
