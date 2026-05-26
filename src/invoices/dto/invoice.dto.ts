import {
    IsString,
    IsEmail,
    IsOptional,
    IsArray,
    IsNumber,
    IsEnum,
    ValidateNested,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
    @IsString()
    itemName: string;

    @IsOptional()
    @IsString()
    subItem?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsNumber()
    @Min(0)
    quantity: number;

    @IsNumber()
    @Min(0)
    unitPrice: number;

    @IsOptional()
    @IsNumber()
    sortOrder?: number;
}

export class CreateInvoiceDto {
    @IsString()
    clientName: string;

    @IsEmail()
    clientEmail: string;

    @IsString()
    clientAddress: string;

    @IsOptional()
    @IsString()
    clientPhone?: string;

    @IsString()
    issueDate: string;

    @IsString()
    dueDate: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInvoiceItemDto)
    items: CreateInvoiceItemDto[];

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsEnum(['draft', 'sent', 'paid'])
    status?: 'draft' | 'sent' | 'paid';

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    taxRate?: number;
}

export class UpdateInvoiceDto extends CreateInvoiceDto { }
