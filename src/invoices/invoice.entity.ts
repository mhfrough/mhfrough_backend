import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    invoiceNumber: string;

    @Column()
    clientName: string;

    @Column()
    clientEmail: string;

    @Column({ type: 'text' })
    clientAddress: string;

    @Column({ nullable: true })
    clientPhone: string;

    @Column({ type: 'varchar', length: 10 })
    issueDate: string;

    @Column({ type: 'varchar', length: 10 })
    dueDate: string;

    @OneToMany(() => InvoiceItem, (item) => item.invoice, {
        cascade: true,
        eager: true,
    })
    items: InvoiceItem[];

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ default: 'draft' })
    status: InvoiceStatus;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    taxRate: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    taxAmount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
