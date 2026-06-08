/**
 * Run once to seed projects:
 *   npx ts-node src/seed-projects.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Project } from './projects/project.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mhfrough_db',
    entities: [Project],
    synchronize: false,
});

const projects = [
    {
        title: 'O2Chat',
        slug: 'o2chat',
        liveUrl: 'https://www.o2chat.io/',
        description:
            'O2Chat is an all-in-one messaging platform designed to streamline customer interactions and boost satisfaction. Add a plug-and-play widget to any website, connect multiple social media channels, and customize everything from business hours to FAQs and agent management.',
        content: `O2Chat is an all-in-one messaging platform designed to streamline customer interactions and boost satisfaction. Add our plug-and-play widget to your website, connect multiple social media channels, and customize everything from business hours to FAQs and agent management.

With O2 AI Bot, you can automate responses, train it with your website, files, or FAQs, and even create unique agents for different websites. Plus, enjoy seamless audio streaming to chat with O2Bot on the go.

✨ Smarter support. Faster responses. Happier customers.

Key Features:

• Easy Plug & Play Widget – Add to any website (supports all platforms) with multi-social media messaging in one place.
• Customization Tools – Business hours, agents, tags, FAQs, groups, topics, filters, custom tabs, text chat, audio chat, notes, and more.
• AI-Powered Automation – O2 AI Bot auto-responds on behalf of agents or during offline hours.
• Smart Training – Train O2Bot with website URLs, file uploads, FAQs, tone settings, and create unique agents for each website widget.
• Seamless Audio Streaming – Connect with O2Bot via live audio, ask questions on the go, and get instant answers.`,
        techStack: ['Angular', 'Front-End Development', 'Audio Recording', 'Artificial Intelligence (AI)', 'SEO'],
        featured: true,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions Pvt Limited · Jan 2025 – Present',
    },
    {
        title: 'ePractise',
        slug: 'epractise',
        liveUrl: 'https://www.epractise.com/',
        description:
            'ePractise is an all-in-one practice management platform designed for tax and accounting firms. It centralizes CRM, client portals, workflows, billing, document management, and secure communication into a single platform.',
        content: `ePractise is an all-in-one practice management platform designed for tax and accounting firms.
It centralizes CRM, client portals, workflows, billing, document management, and secure communication into a single platform.

The system automates the entire client journey from lead capture and onboarding to service delivery and payment collection.

ePractise helps firms reduce manual work, standardize processes, and eliminate reliance on multiple tools.
Real-time dashboards provide visibility into workloads, deadlines, WIP, utilization, and revenue.
Built with enterprise-grade security, ePractise enables firms to scale efficiently while delivering a modern client experience.`,
        techStack: ['Angular', 'Front-End Development', 'Team Leadership'],
        featured: true,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions Pvt Limited · Nov 2023 – Present',
    },
    {
        title: 'Befiler',
        slug: 'befiler',
        liveUrl: 'https://www.befiler.com/',
        description:
            "Befiler is Pakistan's number one leading tax filing and NTN registration portal for individuals and SMEs, simplifying the tax return filing process and promoting a culture of documentation.",
        content: `Befiler is Pakistan's number one leading tax filing and NTN registration portal for individuals and SMEs. Befiler is a joint initiative of a team of leading tax professionals and technology enthusiasts.

The initiative aims to simplify the tax return filing process for individuals; especially the salaried class, and promote a culture of documentation. It aims to enhance the number of tax filers in the interest of enhancing the tax base of the country, at the same time, reducing huge cost to ordinary citizens who have to suffer cost of being non-filers.

Befiler now provides 360 solutions to all your business needs, including Business Incorporation and Trademark Registration in Pakistan and USA.`,
        techStack: ['Angular', 'Front-End Development', 'JavaScript'],
        featured: true,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions Pvt Limited · Aug 2020 – Present',
    },
];

async function seedProjects() {
    await AppDataSource.initialize();
    const projectRepo = AppDataSource.getRepository(Project);

    for (const data of projects) {
        const existing = await projectRepo.findOne({ where: { slug: data.slug } });
        if (existing) {
            console.log(`Project already exists: "${data.title}" — skipping.`);
            continue;
        }
        const project = projectRepo.create(data);
        await projectRepo.save(project);
        console.log(`✅ Project created: "${data.title}"`);
    }

    process.exit(0);
}

seedProjects().catch((err) => { console.error(err); process.exit(1); });
