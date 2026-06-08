import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSortOrderColumns1749400000000 implements MigrationInterface {
    name = 'DropSortOrderColumns1749400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blogs" DROP COLUMN IF EXISTS "sortOrder"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "sortOrder"`);
        await queryRunner.query(`ALTER TABLE "gallery_items" DROP COLUMN IF EXISTS "sortOrder"`);
        await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN IF EXISTS "sortOrder"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "gallery_items" ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0`);
    }
}
