import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('fcm_tokens')
export class FcmToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ type: 'text' })
    token: string;

    @Column({ nullable: true })
    platform: string;

    @CreateDateColumn()
    createdAt: Date;
}
