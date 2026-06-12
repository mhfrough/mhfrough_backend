import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsIn, MaxLength, MinLength } from 'class-validator';
import type { LeadSource, LeadStatus } from '../lead.entity';

const LEAD_SOURCES: LeadSource[] = ['email', 'chat', 'appointment', 'manual'];
const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost'];

export class CreateLeadDto {
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
    @MaxLength(20)
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    website?: string;

    @ApiPropertyOptional({ enum: LEAD_SOURCES })
    @IsOptional()
    @IsIn(LEAD_SOURCES)
    source?: LeadSource;

    @ApiPropertyOptional({ enum: LEAD_STATUSES })
    @IsOptional()
    @IsIn(LEAD_STATUSES)
    status?: LeadStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    projectSummary?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    budget?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;

    @ApiPropertyOptional({ description: 'Link this lead to an existing chat session' })
    @IsOptional()
    @IsString()
    chatSessionId?: string;
}

export class UpdateLeadDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    website?: string;

    @ApiPropertyOptional({ enum: LEAD_SOURCES })
    @IsOptional()
    @IsIn(LEAD_SOURCES)
    source?: LeadSource;

    @ApiPropertyOptional({ enum: LEAD_STATUSES })
    @IsOptional()
    @IsIn(LEAD_STATUSES)
    status?: LeadStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    projectSummary?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    budget?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;
}
