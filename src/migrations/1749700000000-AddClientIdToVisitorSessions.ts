import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientIdToVisitorSessions1749700000000 implements MigrationInterface {
    name = 'AddClientIdToVisitorSessions1749700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "visitor_sessions" ADD COLUMN IF NOT EXISTS "clientId" character varying`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_visitor_sessions_clientId" ON "visitor_sessions" ("clientId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visitor_sessions_clientId"`);
        await queryRunner.query(`ALTER TABLE "visitor_sessions" DROP COLUMN IF EXISTS "clientId"`);
    }
}
