import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { VisitorSession } from './visitor-session.entity';

@Entity('visitor_events')
export class VisitorEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    sessionId: string;

    @ManyToOne(() => VisitorSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sessionId' })
    session: VisitorSession;

    /** e.g. 'contact_submit', 'project_view', 'blog_read', 'gallery_open', 'nav_click' */
    @Column({ type: 'varchar', length: 100 })
    eventName: string;

    @Column({ type: 'varchar', nullable: true })
    path: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, string> | null;

    @CreateDateColumn()
    createdAt: Date;
}
