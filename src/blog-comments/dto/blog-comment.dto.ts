import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateBlogCommentDto {
    @ApiProperty()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    authorName: string;

    @ApiProperty()
    @IsEmail()
    authorEmail: string;

    @ApiProperty()
    @IsString()
    @MinLength(2)
    @MaxLength(2000)
    content: string;
}

export class UnapproveCommentDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminNote?: string;
}
