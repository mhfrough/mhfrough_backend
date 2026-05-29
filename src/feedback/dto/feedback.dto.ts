import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class ReorderFeedbackItemDto {
    @ApiProperty()
    @IsString()
    id: string;

    @ApiProperty()
    @IsInt()
    @Min(0)
    sortOrder: number;
}

export class ReorderFeedbackDto {
    @ApiProperty({ type: [ReorderFeedbackItemDto] })
    @ValidateNested({ each: true })
    @Type(() => ReorderFeedbackItemDto)
    items: ReorderFeedbackItemDto[];
}
