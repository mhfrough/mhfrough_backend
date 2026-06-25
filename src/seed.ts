/**
 * Run once to seed the admin user:
 *   npx ts-node src/seed.ts
 * Or called automatically on app startup via main.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { User, UserRole } from './users/user.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mhfrough_db',
    entities: [User],
    synchronize: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function seedAdminUser() {
    try {
        await AppDataSource.initialize();
        const userRepo = AppDataSource.getRepository(User);

        const email = process.env.ADMIN_EMAIL || 'mhfrough@yahoo.com';
        const existing = await userRepo.findOne({ where: { email } });
        if (existing) {
            console.log('✓ Admin user already exists.');
            return;
        }

        const rawPassword = process.env.ADMIN_PASSWORD;
        if (!rawPassword) {
            console.warn('⚠ ADMIN_PASSWORD env var not set. Skipping admin user creation.');
            return;
        }

        const passwordHash = await bcrypt.hash(rawPassword, 12);
        const admin = userRepo.create({ email, passwordHash, role: UserRole.ADMIN });
        await userRepo.save(admin);
        console.log(`✅ Admin user created: ${email}`);
    } catch (err) {
        console.error('❌ Seed error:', err);
    }
}

// Standalone script execution
async function seed() {
    try {
        await seedAdminUser();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

if (require.main === module) {
    seed();
}
