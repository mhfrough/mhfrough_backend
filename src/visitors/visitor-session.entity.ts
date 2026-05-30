import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('visitor_sessions')
export class VisitorSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** SHA-256(normalizedIp|userAgent) — used for deduplication */
    @Column({ length: 64 })
    @Index()
    fingerprint: string;

    @Column({ type: 'varchar', nullable: true })
    ip: string | null;

    @Column({ type: 'varchar', nullable: true })
    ipVersion: string | null; // 'IPv4' | 'IPv6'

    @Column({ type: 'varchar', nullable: true })
    country: string | null;

    @Column({ type: 'varchar', nullable: true })
    region: string | null;

    @Column({ type: 'varchar', nullable: true })
    city: string | null;

    @Column({ type: 'float', nullable: true })
    lat: number | null;

    @Column({ type: 'float', nullable: true })
    lng: number | null;

    @Column({ type: 'varchar', nullable: true })
    deviceType: string | null; // 'mobile' | 'tablet' | 'desktop'

    @Column({ type: 'varchar', nullable: true })
    browser: string | null;

    @Column({ type: 'varchar', nullable: true })
    browserVersion: string | null;

    @Column({ type: 'varchar', nullable: true })
    os: string | null;

    @Column({ type: 'varchar', nullable: true })
    osVersion: string | null;

    @Column({ type: 'varchar', nullable: true })
    screenRes: string | null; // e.g. '390x844'

    @Column({ type: 'varchar', nullable: true })
    language: string | null;

    @Column({ type: 'varchar', nullable: true })
    referrer: string | null;

    @Column({ type: 'varchar', nullable: true })
    entryPath: string | null;

    @Column({ default: 0 })
    pageViewCount: number;

    @Column({ type: 'bigint', default: 0 })
    sessionDurationMs: number;

    @Column({ default: true })
    bounced: boolean;

    @CreateDateColumn()
    startedAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    lastSeenAt: Date | null;
}
