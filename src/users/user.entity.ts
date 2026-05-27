import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
    ADMIN = 'admin',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    passwordHash: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.ADMIN })
    role: UserRole;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 0 })
    loginAttempts: number;

    @Column({ type: 'timestamptz', nullable: true, default: null })
    lockedUntil: Date | null;

    // ── Profile ──────────────────────────────────────────────────────────────

    @Column({ nullable: true, type: 'varchar' })
    displayName: string | null;

    @Column({ nullable: true, type: 'text' })
    bio: string | null;

    /** Rich HTML content for the public About section on the home page */
    @Column({ nullable: true, type: 'text' })
    aboutHtml: string | null;

    @Column({ nullable: true, type: 'varchar' })
    avatarUrl: string | null;

    /** Public contact email (separate from login email) */
    @Column({ nullable: true, type: 'varchar' })
    contactEmail: string | null;

    @Column({ nullable: true, type: 'varchar' })
    phone: string | null;

    /** e.g. "Karachi, Pakistan" — shown on the contact page */
    @Column({ nullable: true, type: 'varchar' })
    location: string | null;

    @Column({ nullable: true, type: 'varchar', default: 'Asia/Karachi' })
    timezone: string | null;

    @Column({ nullable: true, type: 'varchar' })
    website: string | null;

    @Column({ nullable: true, type: 'varchar' })
    github: string | null;

    @Column({ nullable: true, type: 'varchar' })
    linkedin: string | null;

    @Column({ nullable: true, type: 'varchar' })
    twitter: string | null;

    @Column({ nullable: true, type: 'varchar' })
    instagram: string | null;

    @Column({ nullable: true, type: 'varchar' })
    youtube: string | null;

    @Column({ nullable: true, type: 'varchar' })
    discord: string | null;

    @Column({ nullable: true, type: 'varchar' })
    stackoverflow: string | null;

    @Column({ nullable: true, type: 'varchar' })
    medium: string | null;

    @Column({ nullable: true, type: 'varchar' })
    dribbble: string | null;

    /** Per-field visibility flags: { fieldKey: { footer: boolean; contact: boolean } } */
    @Column({ type: 'simple-json', nullable: true })
    socialVisibility: Record<string, { footer: boolean; contact: boolean }> | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
