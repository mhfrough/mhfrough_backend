import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailMessagesAndResendSettings1749800000000 implements MigrationInterface {
    name = 'CreateEmailMessagesAndResendSettings1749800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "email_messages" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "folder" character varying NOT NULL,
                "to" text NOT NULL,
                "cc" text,
                "subject" character varying,
                "body" text NOT NULL,
                "status" character varying NOT NULL,
                "resendMessageId" character varying,
                "relatedLeadId" uuid,
                "relatedInquiryId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_email_messages" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "resendApiKey" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "emailFromAddress" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "emailFromName" character varying(100) NOT NULL DEFAULT 'Mohammad Hamza'`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "emailEnabled" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "emailEnabled"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "emailFromName"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "emailFromAddress"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "resendApiKey"`);

        await queryRunner.query(`DROP TABLE IF EXISTS "email_messages"`);
    }
}
