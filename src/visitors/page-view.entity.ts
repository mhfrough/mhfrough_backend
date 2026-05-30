import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { VisitorSession } from './visitor-session.entity';

@Entity('page_views')
export class PageView {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    sessionId: string;

    @ManyToOne(() => VisitorSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sessionId' })
    session: VisitorSession;

    @Column({ type: 'varchar', nullable: true })
    path: string | null;

    @Column({ type: 'bigint', nullable: true })
    timeOnPageMs: number | null;

    @CreateDateColumn()
    createdAt: Date;
}
