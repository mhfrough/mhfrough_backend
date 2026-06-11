import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLeadSourceContactToEmail1749900000000 implements MigrationInterface {
    name = 'RenameLeadSourceContactToEmail1749900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "leads" SET "source" = 'email' WHERE "source" = 'contact'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "leads" SET "source" = 'contact' WHERE "source" = 'email'`);
    }
}
