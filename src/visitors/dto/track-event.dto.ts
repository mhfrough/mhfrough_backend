import { IsString, IsUUID, IsOptional, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackEventDto {
    @ApiProperty({ example: 'uuid-session-id' })
    @IsUUID()
    sessionId: string;

    @ApiProperty({ example: 'contact_submit' })
    @IsString()
    @MaxLength(100)
    eventName: string;

    @ApiPropertyOptional({ example: '/contact' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    path?: string;

    @ApiPropertyOptional({ example: { label: 'Send Message' } })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, string>;
}
