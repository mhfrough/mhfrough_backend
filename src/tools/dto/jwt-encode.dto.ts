import { IsDefined, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JwtEncodeDto {
    @ApiProperty({
        description: 'Payload to sign. May be a JSON object or a raw string.',
        example: { sub: '123', name: 'Mohammad' },
    })
    @IsDefined()
    payload: Record<string, unknown> | string;

    @ApiProperty({ description: 'Signing secret / private key.', example: 'super-secret' })
    @IsString()
    secret: string;

    @ApiPropertyOptional({ description: 'Signing algorithm (default HS256).', example: 'HS256' })
    @IsOptional()
    @IsString()
    algorithm?: string;

    @ApiPropertyOptional({ description: 'Expiry, e.g. "1h", "7d" or seconds.', example: '1h' })
    @IsOptional()
    @IsString()
    expiresIn?: string;
}
