import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedbackIsFeatured1750000000000 implements MigrationInterface {
    name = 'AddFeedbackIsFeatured1750000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "isFeatured" boolean NOT NULL DEFAULT false`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN IF EXISTS "isFeatured"`);
    }
}
