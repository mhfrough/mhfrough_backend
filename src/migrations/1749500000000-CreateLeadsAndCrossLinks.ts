import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeadsAndCrossLinks1749500000000 implements MigrationInterface {
    name = 'CreateLeadsAndCrossLinks1749500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "leads" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "phone" character varying,
                "source" character varying NOT NULL DEFAULT 'manual',
                "status" character varying NOT NULL DEFAULT 'new',
                "projectSummary" text,
                "budget" character varying,
                "notes" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_leads" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "leadId" uuid`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "leadId" uuid`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "leadId" uuid`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "leadId" uuid`);

        await queryRunner.query(`ALTER TABLE "inquiries" ADD CONSTRAINT "FK_inquiries_lead" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_lead" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_lead" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD CONSTRAINT "FK_chat_sessions_lead" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "FK_chat_sessions_lead"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_lead"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_lead"`);
        await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT IF EXISTS "FK_inquiries_lead"`);

        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "leadId"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "leadId"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "leadId"`);
        await queryRunner.query(`ALTER TABLE "inquiries" DROP COLUMN IF EXISTS "leadId"`);
        await queryRunner.query(`ALTER TABLE "inquiries" DROP COLUMN IF EXISTS "phone"`);

        await queryRunner.query(`DROP TABLE IF EXISTS "leads"`);
    }
}
