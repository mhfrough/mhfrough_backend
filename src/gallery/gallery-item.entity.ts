import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
    GIF = 'gif',
}

@Entity('gallery_items')
export class GalleryItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    title: string;

    @Column({ type: 'text', nullable: true })
    caption: string;

    @Column()
    mediaUrl: string;

    @Column({ type: 'varchar', default: MediaType.IMAGE })
    mediaType: MediaType;

    @Column({ nullable: true })
    category: string;

    @Column({ default: true })
    isPublished: boolean;

    @Column({ nullable: true })
    altText: string;

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({ nullable: true })
    mimeType: string;

    @Column({ nullable: true, type: 'integer' })
    fileSize: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
