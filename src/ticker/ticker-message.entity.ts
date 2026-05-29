import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ticker_messages')
export class TickerMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ default: true })
    isPublished: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
