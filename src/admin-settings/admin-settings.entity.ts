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

    // ── Widget API Keys ──────────────────────────────────────────────────────
    @Column({ nullable: true, type: 'varchar', length: 200 })
    weatherApiKey: string | null;

    @Column({ nullable: true, type: 'varchar', length: 200 })
    goldApiKey: string | null;

    @Column({ nullable: true, type: 'varchar', length: 200 })
    currencyApiKey: string | null;

    /** City / location used for weather queries */
    @Column({ default: 'Karachi', type: 'varchar', length: 100 })
    weatherCity: string;

    // ── AI Chat Auto-Reply ───────────────────────────────────────────────────
    @Column({ nullable: true, type: 'varchar', length: 500 })
    geminiApiKey: string | null;

    @Column({ default: false })
    aiEnabled: boolean;

    /** professional | friendly | casual | technical */
    @Column({ default: 'professional', type: 'varchar', length: 50 })
    aiTone: string;

    @Column({ nullable: true, type: 'text' })
    aiInstruction: string | null;

    /** Milliseconds to wait before sending the AI reply */
    @Column({ default: 1500 })
    aiAutoReplyDelay: number;

    /** Maximum characters the AI reply should be (enforced via prompt) */
    @Column({ default: 300 })
    aiMaxResponseLength: number;

    // ── Deployment Health ────────────────────────────────────────────────────
    @Column({ nullable: true, type: 'varchar', length: 200 })
    githubToken: string | null;

    /** "owner/repo" for the backend repository */
    @Column({ nullable: true, type: 'varchar', length: 200 })
    githubRepoBackend: string | null;

    /** "owner/repo" for the frontend repository */
    @Column({ nullable: true, type: 'varchar', length: 200 })
    githubRepoFrontend: string | null;

    @Column({ nullable: true, type: 'varchar', length: 200 })
    renderApiKey: string | null;

    @Column({ nullable: true, type: 'varchar', length: 100 })
    renderServiceIdBackend: string | null;

    @Column({ nullable: true, type: 'varchar', length: 100 })
    renderServiceIdFrontend: string | null;

    @Column({ nullable: true, type: 'varchar', length: 100 })
    renderPostgresId: string | null;

    @UpdateDateColumn()
    updatedAt: Date;
}
