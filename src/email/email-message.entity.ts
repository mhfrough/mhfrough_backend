import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type EmailFolder = 'sent' | 'draft';
export type EmailStatus = 'sent' | 'failed' | 'draft';

@Entity('email_messages')
export class EmailMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    folder: EmailFolder;

    /** Comma-separated recipient addresses */
    @Column({ type: 'text' })
    to: string;

    /** Comma-separated CC addresses */
    @Column({ type: 'text', nullable: true })
    cc: string | null;

    @Column({ type: 'varchar', nullable: true })
    subject: string | null;

    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'varchar' })
    status: EmailStatus;

    @Column({ type: 'varchar', nullable: true })
    resendMessageId: string | null;

    @Column({ type: 'uuid', nullable: true })
    relatedLeadId: string | null;

    @Column({ type: 'uuid', nullable: true })
    relatedInquiryId: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
