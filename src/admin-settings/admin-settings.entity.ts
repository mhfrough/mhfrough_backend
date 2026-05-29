import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('admin_settings')
export class AdminSettings {
    @PrimaryGeneratedColumn()
    id: number;

    // ── Inactivity ───────────────────────────────────────────────────────────
    @Column({ default: true })
    enableInactivityLogout: boolean;

    @Column({ default: 10 })
    inactivityTimeoutMinutes: number;

    // ── Login Attempts ───────────────────────────────────────────────────────
    @Column({ default: true })
    enableLoginAttemptSuspend: boolean;

    @Column({ default: 3 })
    maxLoginAttempts: number;

    /** Lock duration in minutes after maxLoginAttempts reached */
    @Column({ default: 180 })
    lockDurationMinutes: number;

    // ── Session ──────────────────────────────────────────────────────────────
    /** Cookie lifetime (days) when Remember Me is checked */
    @Column({ default: 30 })
    rememberMeDays: number;

    /** Cookie lifetime (days) when Remember Me is NOT checked */
    @Column({ default: 1 })
    sessionDurationDays: number;

    // ── Footer / Branding ────────────────────────────────────────────────────
    /** Copyright owner shown in footer, e.g. "mhfrough.dev" */
    @Column({ default: 'mhfrough.dev', type: 'varchar', length: 120 })
    copyrightOwner: string;

    /** Tagline shown in footer after the · separator, e.g. "Made with ♥ in Karāchi" */
    @Column({ default: 'Made with ♥ in Karāchi', type: 'varchar', length: 200 })
    footerTagline: string;

    /** Whether to display the tagline at all */
    @Column({ default: true })
    showFooterTagline: boolean;

    @UpdateDateColumn()
    updatedAt: Date;
}
