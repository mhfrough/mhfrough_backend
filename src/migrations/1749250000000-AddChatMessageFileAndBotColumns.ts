import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatMessageFileAndBotColumns1749250000000 implements MigrationInterface {
    name = 'AddChatMessageFileAndBotColumns1749250000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "fileUrl" character varying DEFAULT NULL`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "fileName" character varying DEFAULT NULL`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "fileType" character varying DEFAULT NULL`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "fileSize" integer DEFAULT NULL`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "isBot" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "isBot"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "fileSize"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "fileType"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "fileName"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "fileUrl"`);
    }
}
