import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateToolUsageLogs1750300000000 implements MigrationInterface {
    name = 'CreateToolUsageLogs1750300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tool_usage_logs" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "toolId" character varying(60) NOT NULL,
                "action" character varying(60),
                "status" character varying(10) NOT NULL DEFAULT 'success',
                "bytesIn" integer,
                "bytesOut" integer,
                "durationMs" integer,
                "ip" character varying(64),
                "userAgent" character varying(512),
                "errorMessage" character varying(500),
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tool_usage_logs" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_tool_usage_logs_toolId"
            ON "tool_usage_logs" ("toolId")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_tool_usage_logs_createdAt"
            ON "tool_usage_logs" ("createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tool_usage_logs_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tool_usage_logs_toolId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tool_usage_logs"`);
    }
}
