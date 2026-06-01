/**
 * Upserts all portfolio projects (insert if new, update if exists by slug):
 *   npx ts-node src/seed-projects-v2.ts
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

// Sort order is most-recent-first based on project start date
const projects: Partial<Project>[] = [
    // ── sortOrder: 1 ── O2Chat ──────────────────────────────────────────────
    {
        slug: 'o2chat',
        title: 'O2Chat',
        liveUrl: 'https://www.o2chat.io/',
        description:
            'O2Chat is a scalable B2B SaaS platform that enhances customer engagement through omnichannel messaging. It offers a customizable live chat widget for websites, and integrations with WhatsApp, Messenger, Instagram, WordPress, Shopify, and Magento.',
        content: `O2Chat is a scalable B2B SaaS platform that enhances customer engagement through omnichannel messaging. It offers a customizable live chat widget for websites, as well as integrations with popular platforms like WhatsApp, Messenger, Instagram, WordPress, Shopify, and Magento.

O2Chat is a comprehensive customer communication platform designed to improve business efficiency and enhance the customer experience. It features a unified inbox for managing interactions across multiple channels and includes an AI chatbot that can be trained using various data sources, such as text, files, and URLs.

The platform supports seamless integrations, unlimited agents, advanced analytics, and enterprise-grade security. Additionally, O2Chat offers white-label solutions, mobile SDKs, and web API access — delivering high performance to help businesses respond faster, sell smarter, and engage customers effectively across both web and mobile platforms.`,
        techStack: ['Angular', 'Front-End Development', 'JavaScript', 'CSS', 'HTML', 'Web Design', 'SEO'],
        featured: true,
        sortOrder: 1,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Sep 2024 – Present',
    },
    // ── sortOrder: 2 ── D-Max ───────────────────────────────────────────────
    {
        slug: 'd-max',
        title: 'D-Max',
        liveUrl: undefined,
        description:
            'D-Max is an internal banking application designed for high-volume data extraction, allowing users to upload, download, and track the progress of large transaction datasets from multiple sources.',
        content: `D-Max is an internal banking application designed for high-volume data extraction, allowing users to upload, download, and track the progress of large transaction datasets from multiple sources.

It streamlines the process by aggregating and structuring the extracted data before storing it efficiently in MongoDB for further analysis or integration.`,
        techStack: ['Angular', 'Front-End Development', 'Web Design', 'SEO', 'Adobe XD'],
        featured: false,
        sortOrder: 2,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Jan 2024 – Present',
    },
    // ── sortOrder: 3 ── ePractise ───────────────────────────────────────────
    {
        slug: 'epractise',
        title: 'ePractise',
        liveUrl: 'https://www.epractise.com/',
        description:
            'ePractise is a cloud-based platform that streamlines practice management for tax consultants, accountants, and firms. It centralizes client records, documents, workflows, and team collaboration in one secure workspace.',
        content: `ePractise is a cloud-based platform that streamlines practice management for tax consultants, accountants, and firms. It centralizes client records, documents, workflows, and team collaboration in one secure workspace. Easily connect with tax software, schedulers, payment gateways, and more.

The system automates the entire client journey from lead capture and onboarding to service delivery and payment collection.

ePractise helps firms reduce manual work, standardize processes, and eliminate reliance on multiple tools. Real-time dashboards provide visibility into workloads, deadlines, WIP, utilization, and revenue. Built with enterprise-grade security, ePractise enables firms to scale efficiently while delivering a modern client experience.`,
        techStack: ['Angular', 'Front-End Development', 'Web Design', 'SEO', 'Adobe XD'],
        featured: true,
        sortOrder: 3,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Jan 2024 – Present',
    },
    // ── sortOrder: 4 ── LLC Savvy ───────────────────────────────────────────
    {
        slug: 'llc-savvy',
        title: 'LLC Savvy',
        liveUrl: 'https://www.llcsavvy.com/',
        description:
            'LLC Savvy is a company formation and tax filing service that helps entrepreneurs start and grow their businesses, offering company formation, tax filing, bookkeeping, and payroll processing in the USA.',
        content: `LLC Savvy is a company formation and tax filing service that helps entrepreneurs start and grow their businesses. We offer a comprehensive suite of services, including company formation, tax filing, bookkeeping, and payroll processing in the USA.`,
        techStack: ['Angular', 'Front-End Development', 'Web Design', 'SEO', 'Adobe XD'],
        featured: false,
        sortOrder: 4,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Jan 2024 – Present',
    },
    // ── sortOrder: 5 ── TMF ─────────────────────────────────────────────────
    {
        slug: 'tmf',
        title: 'TMF – Thardeep Microfinance Foundation',
        liveUrl: undefined,
        description:
            "Thardeep Microfinance Foundation's Loan Management App is a comprehensive digital platform that streamlines the entire micro-lending process from user registration and KYC verification to loan application, approval, disbursement, and repayment.",
        content: `Thardeep Microfinance Foundation's Loan Management App is a comprehensive digital platform that streamlines the entire micro-lending process from user registration and KYC verification to loan application, approval, disbursement, and repayment.

Users can easily apply for loans, upload necessary documents, and track their application status, while field officers conduct on-ground verifications and credit evaluations. The system supports multi-level approvals, EMI scheduling, repayment tracking, and loan rescheduling or top-ups.

It ensures transparency, compliance, and efficiency through real-time dashboards, automated notifications, and secure digital records, ultimately making microfinance more accessible and manageable for underserved communities.`,
        techStack: ['Angular', 'Front-End Development', 'Web Design', 'SEO', 'Adobe XD'],
        featured: false,
        sortOrder: 5,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Sep 2023 – Feb 2024',
    },
    // ── sortOrder: 6 ── Finclore ────────────────────────────────────────────
    {
        slug: 'finclore',
        title: 'Finclore',
        liveUrl: 'https://www.finclore.com/',
        description:
            'Finclore is a company formation and tax filing service that helps entrepreneurs start and grow their businesses, offering company formation, tax filing, bookkeeping, and payroll processing in the USA.',
        content: `Finclore is a company formation and tax filing service that helps entrepreneurs start and grow their businesses. We offer a comprehensive suite of services, including company formation, tax filing, bookkeeping, and payroll processing in the USA.`,
        techStack: ['Angular', 'Front-End Development', 'Web Design', 'SEO', 'Adobe XD'],
        featured: false,
        sortOrder: 6,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Dec 2022 – Present',
    },
    // ── sortOrder: 7 ── KPMC ────────────────────────────────────────────────
    {
        slug: 'kpmc',
        title: 'KPMC – Khairpur Municipal Committee',
        liveUrl: 'https://mckhp.gos.pk/',
        description:
            'The KPMC is an online complaint portal that digitalizes the process for residents of Khairpur to file complaints and track their progress online.',
        content: `The KPMC (Khairpur Municipal Committee) is an online complaint portal that digitalizes the people of Khairpur to file complaints and track their progress online.`,
        techStack: ['Angular', 'Front-End Development', 'Web Design', 'SEO'],
        featured: false,
        sortOrder: 7,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Nov 2022 – Dec 2022',
    },
    // ── sortOrder: 8 ── Emlaak Financials ──────────────────────────────────
    {
        slug: 'emlaak-financials',
        title: 'Emlaak Financials',
        liveUrl: 'https://www.emlaakfinancials.com/',
        description:
            'Emlaak Financials is a Mutual Fund marketplace that allows digital account opening and online investments in mutual funds with centralized tracking of the entire mutual fund portfolio.',
        content: `Emlaak Financials is a Mutual Fund marketplace that allows digital account opening and online investments in mutual funds with centralized tracking of the entire mutual fund portfolio.`,
        techStack: ['Angular', 'Front-End Development', 'JavaScript', 'CSS', 'HTML', 'Web Design', 'SEO', 'Adobe XD', 'PHP'],
        featured: false,
        sortOrder: 8,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Nov 2020 – Present',
    },
    // ── sortOrder: 9 ── Befiler ─────────────────────────────────────────────
    {
        slug: 'befiler',
        title: 'Befiler',
        liveUrl: 'https://www.befiler.com/',
        description:
            "Befiler is Pakistan's number one leading tax filing and NTN registration portal for individuals and SMEs — a joint initiative of leading tax professionals and technology enthusiasts.",
        content: `Befiler is Pakistan's number one leading tax filing and NTN registration portal for individuals and SMEs. Befiler is a joint initiative of a team of leading tax professionals and technology enthusiasts.

Befiler uses a micro-frontend architecture built with Angular to deliver a modular, mobile-responsive application. PHP handles static content and blog features across various portals. The platform includes a separate admin portal, customer portal, standalone website, and multiple widgets.

These widgets are specifically designed for seamless integration within banking applications, allowing customers to file tax returns directly from their banking apps. i18n-based language switcher implementation across the portal.

The initiative aims to simplify the tax return filing process for individuals; especially the salaried class, and promote a culture of documentation. It aims to enhance the number of tax filers in the interest of enhancing the tax base of the country, at the same time, reducing huge cost to ordinary citizens who have to suffer cost of being non-filers.`,
        techStack: ['Angular', 'Front-End Development', 'JavaScript', 'CSS', 'HTML', 'SCSS', 'PHP', 'Web Design', 'SEO'],
        featured: true,
        sortOrder: 9,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Aug 2020 – Present',
    },
    // ── sortOrder: 10 ── Asaan Hisab ────────────────────────────────────────
    {
        slug: 'asaan-hisab',
        title: 'Asaan Hisab',
        liveUrl: 'https://www.asaanhisab.com/',
        description:
            'Asaan Hisab is a free accounting and invoicing platform for entrepreneurs and SMEs, helping them manage expenses, create professional invoices, and take control of cash flow.',
        content: `Accounting & Invoicing for entrepreneurs and SMEs. Asaan Hisab understands your business needs and helps you manage them better. All the features you need to run your business confidently.

Manage your business. Track your expenses. Create professional invoices. Understand your business better. Take control of your cash flow. 100% Free, no annual charges.`,
        techStack: ['Angular', 'Front-End Development', 'JavaScript', 'Web Design', 'SEO'],
        featured: false,
        sortOrder: 10,
        isPublished: true,
        adminNote: 'Associated with Arittek Solutions (Pvt.) Ltd. · Jan 2020 – Jun 2020',
    },
    // ── sortOrder: 11 ── Pizza Delivery Websites ────────────────────────────
    {
        slug: 'pizza-delivery-websites',
        title: 'Pizza Delivery Websites',
        liveUrl: undefined,
        description:
            'Developed and maintained responsive online ordering websites for cloud kitchens and pizzerias in Germany.',
        content: `Developed and maintained responsive online ordering websites for cloud kitchens and pizzerias, including:

Joker Pizza · Manusalwa · Pinseria · Pizza Turtle · Pizzeria · Pizza Roma · Speed Pizza`,
        techStack: ['Front-End Development', 'Web Design', 'JavaScript', 'CSS', 'HTML'],
        featured: false,
        sortOrder: 11,
        isPublished: true,
        adminNote: 'Freelance · Remote (Germany)',
    },
    // ── sortOrder: 12 ── Service Booking Platforms ──────────────────────────
    {
        slug: 'service-booking-platforms',
        title: 'Service Booking Platforms',
        liveUrl: undefined,
        description:
            'Built and customized web platforms for local service providers in the UK.',
        content: `Built and customized web platforms for local service providers:

Hot-n-Cold · SOS 24`,
        techStack: ['Front-End Development', 'Web Design', 'JavaScript', 'CSS', 'HTML'],
        featured: false,
        sortOrder: 12,
        isPublished: true,
        adminNote: 'Freelance · Remote (UK)',
    },
];

async function seedProjects() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Project);

    for (const data of projects) {
        const existing = await repo.findOne({ where: { slug: data.slug } });
        if (existing) {
            Object.assign(existing, data);
            await repo.save(existing);
            console.log(`✏️  Updated: "${data.title}"`);
        } else {
            const project = repo.create(data);
            await repo.save(project);
            console.log(`✅  Created: "${data.title}"`);
        }
    }

    process.exit(0);
}

seedProjects().catch((err) => { console.error(err); process.exit(1); });
