import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

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
}
