import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, Min, Max, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
    @ApiProperty()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    company?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    role?: string;

    @ApiProperty()
    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    review: string;

    @ApiProperty({ minimum: 1, maximum: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;
}

export class UnapproveDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminNote?: string;
}

export class FeatureDto {
    @ApiProperty()
    @IsBoolean()
    featured: boolean;
}
