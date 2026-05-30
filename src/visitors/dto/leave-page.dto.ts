import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeavePageDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    sessionId: string;

    @ApiPropertyOptional({ example: '/blog' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    path?: string;

    @ApiPropertyOptional({ description: 'Milliseconds spent on the page' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    timeOnPageMs?: number;
}
