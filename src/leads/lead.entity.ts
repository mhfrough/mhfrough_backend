import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Inquiry } from '../inquiries/inquiry.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Invoice } from '../invoices/invoice.entity';
import { ChatSession } from '../chat/chat-session.entity';

export type LeadSource = 'email' | 'chat' | 'appointment' | 'manual';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'quoted' | 'won' | 'lost';

@Entity('leads')
export class Lead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    email: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string | null;

    @Column({ type: 'varchar', nullable: true })
    website: string | null;

    @Column({ type: 'varchar', default: 'manual' })
    source: LeadSource;

    @Column({ type: 'varchar', default: 'new' })
    status: LeadStatus;

    @Column({ type: 'text', nullable: true })
    projectSummary: string | null;

    @Column({ type: 'varchar', nullable: true })
    budget: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Inquiry, (i) => i.lead)
    inquiries: Inquiry[];

    @OneToMany(() => Appointment, (a) => a.lead)
    appointments: Appointment[];

    @OneToMany(() => Invoice, (inv) => inv.lead)
    invoices: Invoice[];

    @OneToMany(() => ChatSession, (c) => c.lead)
    chatSessions: ChatSession[];
}
