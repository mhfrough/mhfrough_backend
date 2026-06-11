import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendEmailDto {
    @ApiProperty({ type: [String] })
    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    to: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    cc?: string[];

    @ApiProperty()
    @IsString()
    @MaxLength(300)
    subject: string;

    @ApiProperty()
    @IsString()
    html: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    relatedLeadId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    relatedInquiryId?: string;
}

export class SaveDraftDto {
    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    to?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    cc?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(300)
    subject?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    html?: string;
}
