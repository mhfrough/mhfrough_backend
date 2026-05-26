import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Invoice, InvoiceItem])],
    controllers: [InvoicesController],
    providers: [InvoicesService],
})
export class InvoicesModule { }
