import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PasswordHashDto {
    @ApiProperty({ example: 'correct horse battery staple', maxLength: 512 })
    @IsString()
    @MaxLength(512)
    password: string;

    @ApiProperty({
        enum: ['bcrypt', 'md5', 'sha1', 'sha256', 'sha512'],
        description: 'Hashing algorithm.',
        example: 'bcrypt',
    })
    @IsIn(['bcrypt', 'md5', 'sha1', 'sha256', 'sha512'])
    algorithm: 'bcrypt' | 'md5' | 'sha1' | 'sha256' | 'sha512';

    @ApiPropertyOptional({ description: 'bcrypt cost rounds 4-15 (default 10).', example: 10 })
    @IsOptional()
    @IsInt()
    @Min(4)
    @Max(15)
    rounds?: number;
}
