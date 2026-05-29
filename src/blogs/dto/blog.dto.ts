import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBlogDto {
    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    slug: string;

    @ApiProperty()
    @IsString()
    excerpt: string;

    @ApiProperty()
    @IsString()
    content: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    coverImage?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    readTimeMinutes?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminNote?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class UpdateBlogDto extends CreateBlogDto { }

export class UnpublishBlogDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminNote?: string;
}

export class ReorderBlogItemDto {
    @ApiProperty()
    @IsString()
    id: string;

    @ApiProperty()
    @IsInt()
    @Min(0)
    sortOrder: number;
}

export class ReorderBlogDto {
    @ApiProperty({ type: [ReorderBlogItemDto] })
    @ValidateNested({ each: true })
    @Type(() => ReorderBlogItemDto)
    items: ReorderBlogItemDto[];
}
