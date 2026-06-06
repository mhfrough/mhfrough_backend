import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixGalleryFileSizeType1749350000000 implements MigrationInterface {
    name = 'FixGalleryFileSizeType1749350000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "gallery_items"
            ALTER COLUMN "fileSize" TYPE integer
            USING "fileSize"::integer
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "gallery_items"
            ALTER COLUMN "fileSize" TYPE bigint
            USING "fileSize"::bigint
        `);
    }
}
