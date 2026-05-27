import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('projects')
export class Project {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ nullable: true })
    thumbnail: string;

    @Column('simple-array', { nullable: true })
    techStack: string[];

    @Column({ nullable: true })
    liveUrl: string;

    @Column({ nullable: true })
    githubUrl: string;

    @Column({ default: true })
    featured: boolean;

    @Column({ default: 0 })
    sortOrder: number;

    @Column({ default: true })
    isPublished: boolean;

    @Column({ nullable: true, type: 'text' })
    adminNote: string;

    @Column({ nullable: true, unique: true })
    slug: string;

    @Column({ nullable: true, type: 'text' })
    content: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
