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

    @OneToMany(() => ChatMessage, (m) => m.session, { cascade: true })
    messages: ChatMessage[];
}
