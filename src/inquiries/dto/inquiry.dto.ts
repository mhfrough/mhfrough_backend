import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
