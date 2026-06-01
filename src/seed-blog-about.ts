/**
 * Seed the "About Me & This Website" blog post:
 *   npx ts-node src/seed-blog-about.ts
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

async function seed() {
    await AppDataSource.initialize();
    const blogRepo = AppDataSource.getRepository(Blog);

    const slug = 'about-me-and-mhfrough-dev';
    const existing = await blogRepo.findOne({ where: { slug } });
    if (existing) {
        console.log('Blog post already exists, skipping.');
        process.exit(0);
    }

    const post = blogRepo.create({
        title: 'About Me & This Website',
        slug,
        excerpt:
            'A quick introduction to who I am, what I do, and why I built mhfrough.dev from scratch.',
        content: `## Who Am I?

Hi — I'm **Mohammad Hamza**, an application developer and product designer based in Karāchi, Pakistan. I currently work as **Lead Front-end Developer** at Arittek Solutions (Pvt.) Ltd., where I lead the development of web and mobile products used by real people every day.

I hold a Bachelor of Science in Computer Science from **Karāchi Institute of Economics & Technology (KIET)**, formerly known as PAF-KIET. My journey into tech started with a curiosity for how things work under the hood — and that curiosity has never stopped.

## What I Do

I work across the full product lifecycle — from early wireframes and UI/UX mockups all the way through to deployment and beyond. My primary stack is **Angular** on the frontend and **NestJS** on the backend, with **PostgreSQL** as my go-to database. I also work with TypeScript, PWA & SSR techniques, hybrid mobile development, and AI integrations.

Beyond writing code, I care deeply about the experience behind it — how an interface feels, how fast it loads, how intuitive it is to use. Design and engineering are two sides of the same coin for me.

## Why I Built This Website

I built **mhfrough.dev** because I wanted a space that was entirely mine — not a template, not a drag-and-drop builder, but something crafted from scratch with the same tools and standards I bring to client work.

The site is a full-stack application:

- **Frontend**: Angular 17+ with SSR, PWA support, and a custom design system
- **Backend**: NestJS REST API with JWT authentication, real-time WebSocket events, push notifications via FCM, and a full blog & project CMS
- **Database**: PostgreSQL hosted on Render
- **Deployment**: Both frontend and backend are deployed on Render

Every feature you see — the blog, the projects showcase, the contact form, the live chat widget, the admin panel — was designed and built by me, end to end.

## What's Next?

I plan to keep this site growing. Expect more blog posts on Angular, NestJS, product design, and whatever interesting problems I'm solving at the time. If you want to work together or just say hello, head over to the [contact page](/contact).

— **Mohammad Hamza**`,
        tags: ['personal', 'about', 'angular', 'nestjs', 'mhfrough.dev'],
        readTimeMinutes: 3,
        isPublished: true,
        publishedAt: new Date(),
    });

    await blogRepo.save(post);
    console.log(`✅ Blog post created: "${post.title}"`);
    process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
