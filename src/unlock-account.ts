import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './users/user.entity';

dotenv.config();

const ADMIN_EMAIL = 'mhfrough@yahoo.com';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mhfrough_db',
    entities: [User],
    synchronize: false,
});

async function run() {
    await AppDataSource.initialize();
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
    if (!user) {
        console.error(`No account found for ${ADMIN_EMAIL}`);
        await AppDataSource.destroy();
        process.exit(1);
    }

    const wasLocked = user.lockedUntil !== null && new Date(user.lockedUntil) > new Date();

    user.loginAttempts = 0;
    user.lockedUntil = null;
    await userRepo.save(user);

    if (wasLocked) {
        console.log(`✔ Account unlocked: ${ADMIN_EMAIL}`);
    } else {
        console.log(`✔ Login counter reset for: ${ADMIN_EMAIL} (account was not locked)`);
    }

    await AppDataSource.destroy();
    process.exit(0);
}

run().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
