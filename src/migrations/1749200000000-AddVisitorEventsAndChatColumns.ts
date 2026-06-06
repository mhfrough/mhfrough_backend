import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisitorEventsAndChatColumns1749200000000 implements MigrationInterface {
    name = 'AddVisitorEventsAndChatColumns1749200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── visitor_events ─────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "visitor_events" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "sessionId" uuid NOT NULL,
                "eventName" character varying(100) NOT NULL,
                "path" character varying,
                "metadata" jsonb,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_visitor_events" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_visitor_events_sessionId" ON "visitor_events" ("sessionId")`);
        await queryRunner.query(`
            ALTER TABLE "visitor_events"
            ADD CONSTRAINT "FK_visitor_events_sessionId"
            FOREIGN KEY ("sessionId") REFERENCES "visitor_sessions"("id") ON DELETE CASCADE
        `);

        // ── chat_sessions: add visitorSessionId & notes ────────────────────────
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "visitorSessionId" character varying`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "notes" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "notes"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "visitorSessionId"`);

        await queryRunner.query(`ALTER TABLE "visitor_events" DROP CONSTRAINT "FK_visitor_events_sessionId"`);
        await queryRunner.query(`DROP INDEX "IDX_visitor_events_sessionId"`);
        await queryRunner.query(`DROP TABLE "visitor_events"`);
    }
}
