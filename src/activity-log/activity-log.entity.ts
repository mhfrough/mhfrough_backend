import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // e.g. 'blog:create', 'inquiry:delete', 'feedback:approve', 'error:client'
    @Column()
    action: string;

    // e.g. 'blog', 'project', 'inquiry', 'feedback', 'comment', 'invoice', 'push', 'system'
    @Column()
    resource: string;

    @Column({ nullable: true })
    resourceId: string;

    @Column({ nullable: true })
    resourceTitle: string;

    @Column({ type: 'text' })
    description: string;

    // 'success' | 'error'
    @Column({ default: 'success' })
    status: string;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;
}
