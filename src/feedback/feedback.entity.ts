import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('feedback')
export class Feedback {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    company: string;

    @Column({ nullable: true })
    role: string;

    @Column({ type: 'text' })
    review: string;

    @Column({ type: 'int', default: 5 })
    rating: number;

    @Column({ nullable: true })
    avatarUrl: string;

    @Column({ default: false })
    isApproved: boolean;

    @Column({ default: true })
    showOnSite: boolean;

    @Column({ nullable: true, type: 'text' })
    adminNote: string;

    @Column({ default: 0 })
    sortOrder: number;

    @CreateDateColumn()
    createdAt: Date;
}
