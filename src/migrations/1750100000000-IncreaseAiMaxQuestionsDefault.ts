import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseAiMaxQuestionsDefault1750100000000 implements MigrationInterface {
    name = 'IncreaseAiMaxQuestionsDefault1750100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_settings" ALTER COLUMN "aiMaxQuestions" SET DEFAULT 12`);
        await queryRunner.query(`UPDATE "admin_settings" SET "aiMaxQuestions" = 12 WHERE "aiMaxQuestions" = 6`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_settings" ALTER COLUMN "aiMaxQuestions" SET DEFAULT 6`);
        await queryRunner.query(`UPDATE "admin_settings" SET "aiMaxQuestions" = 6 WHERE "aiMaxQuestions" = 12`);
    }
}
