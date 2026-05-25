/**
 * Run once to seed LinkedIn reviews:
 *   npx ts-node src/seed-reviews.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Feedback } from './feedback/feedback.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mhfrough_db',
    entities: [Feedback],
    synchronize: false,
});

const reviews = [
    {
        name: 'Faraz Gul',
        role: 'Angular Developer',
        company: 'Centegy Technologies',
        review: `I had the privilege of working under Sir Hamza as my Angular lead, and it was an incredible experience. His technical expertise, especially in debugging, is truly unmatched – I've never seen someone solve complex issues so efficiently. Beyond his skills, he is extremely soft-spoken, patient, and supportive, making the work environment stress-free and motivating. A remarkable mentor and an amazing leader to learn from.`,
        rating: 5,
        isApproved: true,
        showOnSite: true,
    },
    {
        name: 'Muhammad Ramis',
        role: 'Senior Software Engineer',
        company: '',
        review: `Whenever we've needed Hamza's service, he's always shown up on time and reliably worked with us and proved his worth.`,
        rating: 5,
        isApproved: true,
        showOnSite: true,
    },
];

async function seed() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Feedback);

    for (const data of reviews) {
        const existing = await repo.findOne({ where: { name: data.name } });
        if (existing) {
            console.log(`Review from ${data.name} already exists — skipping.`);
            continue;
        }
        const entry = repo.create(data);
        await repo.save(entry);
        console.log(`✅ Review from ${data.name} added.`);
    }

    process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
