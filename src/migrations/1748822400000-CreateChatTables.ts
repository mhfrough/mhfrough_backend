import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateChatTables1748822400000 implements MigrationInterface {
    name = 'CreateChatTables1748822400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'chat_sessions',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    { name: 'visitorName', type: 'varchar', isNullable: true },
                    { name: 'status', type: 'varchar', default: "'active'" },
                    { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
                    { name: 'lastActivityAt', type: 'timestamp with time zone', default: 'now()' },
                ],
            }),
            true,
        );

        await queryRunner.createTable(
            new Table({
                name: 'chat_messages',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    { name: 'sessionId', type: 'uuid' },
                    { name: 'content', type: 'text' },
                    { name: 'sender', type: 'varchar', default: "'visitor'" },
                    { name: 'messageType', type: 'varchar', default: "'text'" },
                    { name: 'audioUrl', type: 'varchar', isNullable: true, default: null },
                    { name: 'read', type: 'boolean', default: false },
                    { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
                ],
            }),
            true,
        );

        await queryRunner.createForeignKey(
            'chat_messages',
            new TableForeignKey({
                columnNames: ['sessionId'],
                referencedTableName: 'chat_sessions',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createTable(
            new Table({
                name: 'chat_settings',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    { name: 'key', type: 'varchar', isUnique: true },
                    { name: 'value', type: 'text' },
                    { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('chat_settings', true);
        await queryRunner.dropTable('chat_messages', true);
        await queryRunner.dropTable('chat_sessions', true);
    }
}
