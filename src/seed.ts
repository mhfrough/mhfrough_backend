/**
 * Run once to seed the admin user:
 *   npx ts-node src/seed.ts
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
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'mhfrough_db',
  entities: [User],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);

  const email = process.env.ADMIN_EMAIL || 'mhfrough@yahoo.com';
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    console.log('Admin user already exists.');
    process.exit(0);
  }

  // Prompt securely — password is read from env var ADMIN_SEED_PASSWORD
  const rawPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!rawPassword) {
    console.error('Set ADMIN_SEED_PASSWORD env var before seeding.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(rawPassword, 12);
  const admin = userRepo.create({ email, passwordHash, role: UserRole.ADMIN });
  await userRepo.save(admin);
  console.log(`✅ Admin user created: ${email}`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
