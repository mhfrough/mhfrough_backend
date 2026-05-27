import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('login_sessions')
export class LoginSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column({ nullable: true, type: 'varchar' })
    ip: string | null;

    @Column({ nullable: true, type: 'text' })
    userAgent: string | null;

    @Column({ nullable: true, type: 'varchar' })
    browser: string | null;

    @Column({ nullable: true, type: 'varchar' })
    os: string | null;

    @Column({ nullable: true, type: 'varchar' })
    country: string | null;

    @Column({ nullable: true, type: 'varchar' })
    city: string | null;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'timestamptz', nullable: true, default: null })
    revokedAt: Date | null;

    @CreateDateColumn()
    loginAt: Date;
}
