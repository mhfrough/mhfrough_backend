import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('blogs')
export class Blog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ unique: true })
    slug: string;

    @Column({ type: 'text' })
    excerpt: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ nullable: true })
    coverImage: string;

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({ default: 0 })
    readTimeMinutes: number;

    @Column({ default: false })
    isPublished: boolean;

    @Column({ nullable: true, type: 'text' })
    adminNote: string;

    @Column({ nullable: true, type: 'timestamp' })
    publishedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
