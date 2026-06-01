/**
 * Run once to seed a dummy blog post:
 *   npx ts-node src/seed-blog.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Blog } from './blogs/blog.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mhfrough_db',
    entities: [Blog],
    synchronize: false,
});

async function seedBlog() {
    await AppDataSource.initialize();
    const blogRepo = AppDataSource.getRepository(Blog);

    const slug = 'hello-world-exciting-news';
    const existing = await blogRepo.findOne({ where: { slug } });
    if (existing) {
        console.log('Blog post already exists.');
        process.exit(0);
    }

    const post = blogRepo.create({
        title: 'Hello World — Exciting News!',
        slug,
        excerpt: 'Hello world, I am exciting to share this news with all of you.',
        content: `Hello world, I am exciting to share this news with all of you.

This is my very first blog post on mhfrough.dev. I have been working hard behind the scenes to build this platform from scratch — a full-stack personal portfolio and blog powered by Angular and NestJS.

Stay tuned for more posts covering web development, software engineering, and everything in between. This is just the beginning!

— Mohammad Hamza`,
        tags: ['hello-world', 'announcements', 'personal'],
        readTimeMinutes: 1,
        isPublished: true,
        publishedAt: new Date(),
    });

    await blogRepo.save(post);
    console.log(`✅ Blog post created: "${post.title}"`);
    process.exit(0);
}

seedBlog().catch((err) => { console.error(err); process.exit(1); });
