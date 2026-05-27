import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'mhfrough@yahoo.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'yourPassword' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    rememberMe?: boolean;
}
