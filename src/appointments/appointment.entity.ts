import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

@Entity('appointments')
export class Appointment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    clientName: string;

    @Column({ nullable: true })
    clientEmail: string;

    @Column({ nullable: true })
    clientPhone: string;

    @Column({ type: 'date' })
    date: string; // YYYY-MM-DD

    @Column({ length: 5 })
    startTime: string; // HH:MM

    @Column({ default: 60 })
    durationMinutes: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'varchar', default: 'pending' })
    status: AppointmentStatus;

    @Column({ type: 'timestamp', nullable: true })
    reminderSentAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
