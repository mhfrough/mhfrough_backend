import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Blog } from '../blogs/blog.entity';

@Entity('blog_comments')
export class BlogComment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    blogId: string;

    @ManyToOne(() => Blog, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blogId' })
    blog: Blog;

    @Column({ length: 100 })
    authorName: string;

    @Column({ length: 254 })
    authorEmail: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ default: false })
    isApproved: boolean;

    @Column({ nullable: true, type: 'text' })
    adminNote: string;

    @CreateDateColumn()
    createdAt: Date;
}
