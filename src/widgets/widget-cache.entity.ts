import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('widget_cache')
export class WidgetCache {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    key: string; // 'weather' | 'gold' | 'usd_pkr'

    @Column({ type: 'jsonb', nullable: true })
    data: Record<string, unknown> | null;

    @Column({ type: 'timestamptz', nullable: true })
    lastFetched: Date | null;

    @UpdateDateColumn()
    updatedAt: Date;
}
