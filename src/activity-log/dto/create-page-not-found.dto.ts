import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageNotFoundDto {
    @ApiPropertyOptional({ description: 'URL that was not found' })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    url?: string;
}
