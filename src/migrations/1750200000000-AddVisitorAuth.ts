import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisitorAuth1750200000000 implements MigrationInterface {
    name = 'AddVisitorAuth1750200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // visitor_users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "visitor_users" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "email" character varying(300),
                "displayName" character varying(200),
                "avatarUrl" text,
                "provider" character varying(30) NOT NULL,
                "providerId" character varying(200) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "lastLoginAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_visitor_users" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_visitor_users_provider_id"
            ON "visitor_users" ("provider", "providerId")
        `);

        // Visitor OAuth settings on admin_settings
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "visitorAuthEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "googleOAuthEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "googleClientId" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "googleClientSecret" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "githubOAuthEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "githubClientId" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "githubClientSecret" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "linkedinOAuthEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "linkedinClientId" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "linkedinClientSecret" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "discordOAuthEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "discordClientId" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "discordClientSecret" character varying(300)`);

        // aiMaxQuestions (was added in a separate migration but ensure it exists)
        await queryRunner.query(`ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "aiMaxQuestions" integer NOT NULL DEFAULT 12`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "discordClientSecret"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "discordClientId"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "discordOAuthEnabled"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "linkedinClientSecret"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "linkedinClientId"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "linkedinOAuthEnabled"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "githubClientSecret"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "githubClientId"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "githubOAuthEnabled"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "googleClientSecret"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "googleClientId"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "googleOAuthEnabled"`);
        await queryRunner.query(`ALTER TABLE "admin_settings" DROP COLUMN IF EXISTS "visitorAuthEnabled"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "visitor_users"`);
    }
}
