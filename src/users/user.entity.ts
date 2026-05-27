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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
