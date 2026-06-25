/**
 * TypeORM CLI data source.
 *
 * Used by the `migration:*` npm scripts to generate/run migrations against the
 * configured database (Supabase Postgres). The NestJS app itself builds its
 * connection from the same env vars in app.module.ts — this file only exists so
 * the TypeORM CLI has a DataSource to point at.
 *
 *   npm run migration:run      # apply all pending migrations
 *   npm run migration:revert   # roll back the last migration
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'mhfrough_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
