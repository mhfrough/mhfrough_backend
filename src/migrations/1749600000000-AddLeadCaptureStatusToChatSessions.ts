import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeadCaptureStatusToChatSessions1749600000000 implements MigrationInterface {
    name = 'AddLeadCaptureStatusToChatSessions1749600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "leadCaptureStatus" character varying NOT NULL DEFAULT 'pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "leadCaptureStatus"`);
    }
}
