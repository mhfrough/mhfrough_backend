import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PushNotifSource {
    INQUIRY = 'inquiry',
    FEEDBACK = 'feedback',
    COMMENT = 'comment',
    CHAT = 'chat',
    ADMIN = 'admin',
}

export enum PushNotifStatus {
    SUCCESS = 'success',
    PARTIAL = 'partial',
    FAILED = 'failed',
    SKIPPED = 'skipped',
}

@Entity('push_notification_logs')
export class PushNotificationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ nullable: true })
    url: string;

    @Column({ type: 'enum', enum: PushNotifSource })
    source: PushNotifSource;

    @Column({ type: 'enum', enum: PushNotifStatus, default: PushNotifStatus.SUCCESS })
    status: PushNotifStatus;

    @Column({ type: 'int', default: 0 })
    sentCount: number;

    @Column({ type: 'int', default: 0 })
    failedCount: number;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn()
    createdAt: Date;
}
