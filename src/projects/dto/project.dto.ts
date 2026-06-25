import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

/** Treat empty/blank strings as "not provided" so @IsOptional skips them. */
const emptyToUndefined = ({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateProjectDto {
    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    thumbnail?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    techStack?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiPropertyOptional()
    @Transform(emptyToUndefined)
    @IsOptional()
    @IsUrl()
    liveUrl?: string;

    @ApiPropertyOptional()
    @Transform(emptyToUndefined)
    @IsOptional()
    @IsUrl()
    githubUrl?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    featured?: boolean;

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
    @IsString()
    slug?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    content?: string;
}

export class UpdateProjectDto extends CreateProjectDto { }

export class PatchFeaturedDto {
    @ApiProperty()
    @IsBoolean()
    featured: boolean;
}

export class UnpublishProjectDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminNote?: string;
}
