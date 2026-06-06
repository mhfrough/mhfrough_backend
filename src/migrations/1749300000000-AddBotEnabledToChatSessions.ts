import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBotEnabledToChatSessions1749300000000 implements MigrationInterface {
    name = 'AddBotEnabledToChatSessions1749300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "botEnabled" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "botEnabled"`);
    }
}
