import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiMaxQuestionsToAdminSettings1750000000001 implements MigrationInterface {
    name = 'AddAiMaxQuestionsToAdminSettings1750000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "aiMaxQuestions" integer NOT NULL DEFAULT 6`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "aiMaxQuestions"`);
    }
}
