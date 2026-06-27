import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('visitor_users')
export class VisitorUser {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true, type: 'varchar', length: 300 })
    email: string | null;

    @Column({ nullable: true, type: 'varchar', length: 200 })
    displayName: string | null;

    @Column({ nullable: true, type: 'text' })
    avatarUrl: string | null;

    /** google | github | linkedin | discord */
    @Column({ type: 'varchar', length: 30 })
    provider: string;

    @Column({ type: 'varchar', length: 200 })
    providerId: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    lastLoginAt: Date | null;
}
