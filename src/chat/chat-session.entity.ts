import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { Lead } from '../leads/lead.entity';

export type SessionStatus = 'active' | 'closed';

@Entity('chat_sessions')
export class ChatSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    visitorName: string;

    @Column({ type: 'varchar', default: 'active' })
    status: SessionStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    lastActivityAt: Date;

    /** Visitor session ID from the analytics tracker — links chat to visitor journey */
    @Column({ type: 'varchar', nullable: true })
    visitorSessionId: string | null;

    /** Private admin notes for this session */
    @Column({ type: 'text', nullable: true, default: null })
    notes: string | null;

    /** Whether the AI chatbot auto-reply is enabled for this session */
    @Column({ default: true })
    botEnabled: boolean;

    @OneToMany(() => ChatMessage, (m) => m.session, { cascade: true })
    messages: ChatMessage[];

    @Column({ type: 'uuid', nullable: true })
    leadId: string | null;

    @ManyToOne(() => Lead, (lead) => lead.chatSessions, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'leadId' })
    lead: Lead | null;

    /** Tracks whether the AI has captured (or given up trying to capture) this visitor's contact info */
    @Column({ type: 'varchar', default: 'pending' })
    leadCaptureStatus: 'pending' | 'done';
}
