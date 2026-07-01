import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UrlDto {
    @ApiProperty({ description: 'Absolute http(s) URL to fetch.', example: 'https://example.com', maxLength: 2048 })
    @IsString()
    @MaxLength(2048)
    url: string;
}
