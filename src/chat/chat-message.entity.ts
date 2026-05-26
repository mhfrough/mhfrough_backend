import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

export type MessageSender = 'visitor' | 'admin';

@Entity('chat_messages')
export class ChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    sessionId: string;

    @ManyToOne(() => ChatSession, (s) => s.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sessionId' })
    session: ChatSession;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'varchar', default: 'visitor' })
    sender: MessageSender;

    @Column({ default: false })
    read: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
