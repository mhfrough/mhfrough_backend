import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PingVisitorDto {
    @ApiPropertyOptional({ description: 'Existing session ID (from sessionStorage)' })
    @IsOptional()
    @IsUUID()
    sessionId?: string;

    @ApiPropertyOptional({ example: '390x844' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    screenRes?: string;

    @ApiPropertyOptional({ example: 'en-US' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    language?: string;

    @ApiPropertyOptional({ example: 'https://google.com' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    referrer?: string;

    @ApiPropertyOptional({ example: '/blog' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    path?: string;
}
