/**
 * One-off Supabase fresh-start bootstrap.
 *
 *   npx ts-node src/bootstrap-supabase.ts
 *
 * The incremental migrations in src/migrations were authored against a DB whose
 * base tables (e.g. `appointments`) already existed via `synchronize`, so they
 * cannot rebuild an empty database on their own. Instead we:
 *   1. Drop everything (true fresh start).
 *   2. Build the full schema from the current entities via synchronize.
 *   3. Stamp every existing migration as already-applied, so the app's
 *      migrationsRun (prod) skips them and only runs FUTURE migrations.
 *
 * Safe to re-run: it always drops and rebuilds.
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'mhfrough_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
  await ds.initialize();
  console.log('• Connected to', process.env.DB_HOST);

  console.log('• Dropping existing schema…');
  await ds.dropDatabase();

  console.log('• Building schema from entities (synchronize)…');
  await ds.synchronize();

  console.log('• Stamping migrations as applied…');
  await ds.query(
    `CREATE TABLE IF NOT EXISTS "migrations" (
       "id" SERIAL PRIMARY KEY,
       "timestamp" bigint NOT NULL,
       "name" character varying NOT NULL
     )`,
  );

  const migDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migDir)
    .filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith('.d.ts'));

  for (const f of files) {
    const m = f.match(/^(\d+)-(.+)\.(ts|js)$/);
    if (!m) continue;
    const timestamp = m[1];
    const name = `${m[2]}${timestamp}`; // TypeORM stores ClassName + timestamp
    await ds.query(
      `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
      [timestamp, name],
    );
    console.log(`   ✓ ${name}`);
  }

  const tables: Array<{ tablename: string }> = await ds.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  console.log(`\n✅ Done. ${tables.length} tables in public schema:`);
  console.log('   ' + tables.map((t) => t.tablename).join(', '));

  await ds.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
