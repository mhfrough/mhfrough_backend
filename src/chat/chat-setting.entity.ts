import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('chat_settings')
export class ChatSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'text' })
    value: string;

    @UpdateDateColumn()
    updatedAt: Date;
}
