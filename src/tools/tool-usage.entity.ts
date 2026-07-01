import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * One row per tool invocation (both backend-processed tools and client-side
 * tools that report their use). Powers usage analytics for the public /tools
 * section. Kept deliberately lightweight — no FK to visitor sessions so it
 * survives independently of visitor-data clears.
 */
@Entity('tool_usage_logs')
export class ToolUsageLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tool registry id, e.g. 'rem-px', 'minify', 'css-scss'. */
    @Column({ type: 'varchar', length: 60 })
    @Index()
    toolId: string;

    /** Optional sub-action, e.g. 'minify-js', 'scss-to-css', 'px-to-rem'. */
    @Column({ type: 'varchar', length: 60, nullable: true })
    action: string | null;

    @Column({ type: 'varchar', length: 10, default: 'success' })
    status: 'success' | 'error';

    /** Input size in bytes (backend tools only). */
    @Column({ type: 'int', nullable: true })
    bytesIn: number | null;

    /** Output size in bytes (backend tools only). */
    @Column({ type: 'int', nullable: true })
    bytesOut: number | null;

    /** Processing time in milliseconds (backend tools only). */
    @Column({ type: 'int', nullable: true })
    durationMs: number | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    ip: string | null;

    @Column({ type: 'varchar', length: 512, nullable: true })
    userAgent: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    errorMessage: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
