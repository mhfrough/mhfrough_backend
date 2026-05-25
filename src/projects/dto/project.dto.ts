import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsUrl, IsInt, Min } from 'class-validator';

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

    @ApiPropertyOptional()
    @IsOptional()
    @IsUrl()
    liveUrl?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUrl()
    githubUrl?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    featured?: boolean;

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
    adminNote?: string;
}

export class UpdateProjectDto extends CreateProjectDto { }

export class UnpublishProjectDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminNote?: string;
}
