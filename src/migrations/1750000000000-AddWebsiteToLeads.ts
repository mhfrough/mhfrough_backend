import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebsiteToLeads1750000000000 implements MigrationInterface {
    name = 'AddWebsiteToLeads1750000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "website" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "website"`);
    }
}
