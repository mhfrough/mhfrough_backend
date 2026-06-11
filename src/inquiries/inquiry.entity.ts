import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Lead } from '../leads/lead.entity';

export enum InquiryStatus {
    NEW = 'new',
    READ = 'read',
    REPLIED = 'replied',
}

@Entity('inquiries')
export class Inquiry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    email: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string | null;

    @Column({ nullable: true })
    subject: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'enum', enum: InquiryStatus, default: InquiryStatus.NEW })
    status: InquiryStatus;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'uuid', nullable: true })
    leadId: string | null;

    @ManyToOne(() => Lead, (lead) => lead.inquiries, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'leadId' })
    lead: Lead | null;
}
