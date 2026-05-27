import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientErrorDto {
    @ApiProperty({ description: 'Error message' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    message: string;

    @ApiPropertyOptional({ description: 'Stack trace' })
    @IsString()
    @IsOptional()
    @MaxLength(5000)
    stack?: string;

    @ApiPropertyOptional({ description: 'URL where the error occurred' })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    url?: string;

    @ApiPropertyOptional({ description: 'Component or context name' })
    @IsString()
    @IsOptional()
    @MaxLength(200)
    context?: string;
}
