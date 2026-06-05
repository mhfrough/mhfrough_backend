import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiSettingsToAdminSettings1748900000000 implements MigrationInterface {
    name = 'AddAiSettingsToAdminSettings1748900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "geminiApiKey" varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "aiEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "aiTone" varchar(50) NOT NULL DEFAULT 'professional'`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "aiInstruction" text NULL`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "aiAutoReplyDelay" integer NOT NULL DEFAULT 1500`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "aiMaxResponseLength" integer NOT NULL DEFAULT 300`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "aiMaxResponseLength"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "aiAutoReplyDelay"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "aiInstruction"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "aiTone"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "aiEnabled"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "geminiApiKey"`);
    }
}
