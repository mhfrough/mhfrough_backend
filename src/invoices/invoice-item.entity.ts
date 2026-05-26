import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invoiceId' })
    invoice: Invoice;

    @Column()
    itemName: string;

    @Column({ nullable: true })
    subItem: string;

    @Column({ nullable: true })
    category: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
    quantity: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    unitPrice: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column({ default: 0 })
    sortOrder: number;
}
