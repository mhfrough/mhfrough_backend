import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllBaseTables1748000000000 implements MigrationInterface {
    name = 'CreateAllBaseTables1748000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── Enum types ─────────────────────────────────────────────────────────
        await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM('admin')`);
        await queryRunner.query(`CREATE TYPE "inquiries_status_enum" AS ENUM('new', 'read', 'replied')`);
        await queryRunner.query(`CREATE TYPE "push_notification_logs_source_enum" AS ENUM('inquiry', 'feedback', 'comment', 'chat', 'admin')`);
        await queryRunner.query(`CREATE TYPE "push_notification_logs_status_enum" AS ENUM('success', 'partial', 'failed', 'skipped')`);

        // ── users ──────────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "role" "users_role_enum" NOT NULL DEFAULT 'admin',
                "isActive" boolean NOT NULL DEFAULT true,
                "loginAttempts" integer NOT NULL DEFAULT 0,
                "lockedUntil" TIMESTAMP WITH TIME ZONE,
                "displayName" character varying,
                "bio" text,
                "aboutHtml" text,
                "avatarUrl" character varying,
                "contactEmail" character varying,
                "phone" character varying,
                "location" character varying,
                "timezone" character varying DEFAULT 'Asia/Karāchi',
                "website" character varying,
                "github" character varying,
                "linkedin" character varying,
                "twitter" character varying,
                "instagram" character varying,
                "youtube" character varying,
                "discord" character varying,
                "stackoverflow" character varying,
                "medium" character varying,
                "dribbble" character varying,
                "socialVisibility" text,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

        // ── admin_settings ─────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "admin_settings" (
                "id" SERIAL NOT NULL,
                "enableInactivityLogout" boolean NOT NULL DEFAULT true,
                "inactivityTimeoutMinutes" integer NOT NULL DEFAULT 10,
                "enableLoginAttemptSuspend" boolean NOT NULL DEFAULT true,
                "maxLoginAttempts" integer NOT NULL DEFAULT 3,
                "lockDurationMinutes" integer NOT NULL DEFAULT 180,
                "rememberMeDays" integer NOT NULL DEFAULT 30,
                "sessionDurationDays" integer NOT NULL DEFAULT 1,
                "copyrightOwner" character varying(120) NOT NULL DEFAULT 'mhfrough.dev',
                "footerTagline" character varying(200) NOT NULL DEFAULT 'Made with ♥ in Karāchi',
                "showFooterTagline" boolean NOT NULL DEFAULT true,
                "weatherApiKey" character varying(200),
                "goldApiKey" character varying(200),
                "currencyApiKey" character varying(200),
                "weatherCity" character varying(100) NOT NULL DEFAULT 'Karachi',
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_admin_settings" PRIMARY KEY ("id")
            )
        `);

        // ── blogs ──────────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "blogs" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying NOT NULL,
                "slug" character varying NOT NULL,
                "excerpt" text NOT NULL,
                "content" text NOT NULL,
                "coverImage" character varying,
                "tags" text,
                "readTimeMinutes" integer NOT NULL DEFAULT 0,
                "isPublished" boolean NOT NULL DEFAULT false,
                "adminNote" text,
                "sortOrder" integer NOT NULL DEFAULT 0,
                "publishedAt" timestamp,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_blogs_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_blogs" PRIMARY KEY ("id")
            )
        `);

        // ── projects ───────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "projects" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying NOT NULL,
                "description" text NOT NULL,
                "thumbnail" character varying,
                "techStack" text,
                "tags" text,
                "liveUrl" character varying,
                "githubUrl" character varying,
                "featured" boolean NOT NULL DEFAULT true,
                "sortOrder" integer NOT NULL DEFAULT 0,
                "isPublished" boolean NOT NULL DEFAULT true,
                "adminNote" text,
                "slug" character varying,
                "content" text,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_projects_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_projects" PRIMARY KEY ("id")
            )
        `);

        // ── gallery_items ──────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "gallery_items" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying,
                "caption" text,
                "mediaUrl" character varying NOT NULL,
                "mediaType" character varying NOT NULL DEFAULT 'image',
                "category" character varying,
                "sortOrder" integer NOT NULL DEFAULT 0,
                "isPublished" boolean NOT NULL DEFAULT true,
                "altText" character varying,
                "tags" text,
                "mimeType" character varying,
                "fileSize" integer,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_gallery_items" PRIMARY KEY ("id")
            )
        `);

        // ── inquiries ──────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "inquiries" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "subject" character varying,
                "message" text NOT NULL,
                "status" "inquiries_status_enum" NOT NULL DEFAULT 'new',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_inquiries" PRIMARY KEY ("id")
            )
        `);

        // ── feedback ───────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "feedback" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying NOT NULL,
                "company" character varying,
                "role" character varying,
                "review" text NOT NULL,
                "rating" integer NOT NULL DEFAULT 5,
                "avatarUrl" character varying,
                "isApproved" boolean NOT NULL DEFAULT false,
                "showOnSite" boolean NOT NULL DEFAULT true,
                "adminNote" text,
                "sortOrder" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_feedback" PRIMARY KEY ("id")
            )
        `);

        // ── invoices ───────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "invoices" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "invoiceNumber" character varying NOT NULL,
                "clientName" character varying NOT NULL,
                "clientEmail" character varying NOT NULL,
                "clientAddress" text NOT NULL,
                "clientPhone" character varying,
                "issueDate" character varying(10) NOT NULL,
                "dueDate" character varying(10) NOT NULL,
                "notes" text,
                "status" character varying NOT NULL DEFAULT 'draft',
                "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
                "taxRate" numeric(5,2) NOT NULL DEFAULT 0,
                "taxAmount" numeric(12,2) NOT NULL DEFAULT 0,
                "total" numeric(12,2) NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_invoices_invoiceNumber" UNIQUE ("invoiceNumber"),
                CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
            )
        `);

        // ── login_sessions ─────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "login_sessions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "userId" character varying NOT NULL,
                "ip" character varying,
                "userAgent" text,
                "browser" character varying,
                "os" character varying,
                "country" character varying,
                "city" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "revokedAt" TIMESTAMP WITH TIME ZONE,
                "loginAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_login_sessions" PRIMARY KEY ("id")
            )
        `);

        // ── fcm_tokens ─────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "fcm_tokens" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "token" text NOT NULL,
                "platform" character varying,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_fcm_tokens_token" UNIQUE ("token"),
                CONSTRAINT "PK_fcm_tokens" PRIMARY KEY ("id")
            )
        `);

        // ── visitor_sessions ───────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "visitor_sessions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "fingerprint" character varying(64) NOT NULL,
                "ip" character varying,
                "ipVersion" character varying,
                "country" character varying,
                "region" character varying,
                "city" character varying,
                "lat" double precision,
                "lng" double precision,
                "deviceType" character varying,
                "browser" character varying,
                "browserVersion" character varying,
                "os" character varying,
                "osVersion" character varying,
                "screenRes" character varying,
                "language" character varying,
                "referrer" character varying,
                "entryPath" character varying,
                "pageViewCount" integer NOT NULL DEFAULT 0,
                "sessionDurationMs" bigint NOT NULL DEFAULT 0,
                "bounced" boolean NOT NULL DEFAULT true,
                "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "lastSeenAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_visitor_sessions" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_visitor_sessions_fingerprint" ON "visitor_sessions" ("fingerprint")`);

        // ── widget_cache ───────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "widget_cache" (
                "key" character varying(50) NOT NULL,
                "data" jsonb,
                "lastFetched" TIMESTAMP WITH TIME ZONE,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_widget_cache" PRIMARY KEY ("key")
            )
        `);

        // ── ticker_messages ────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "ticker_messages" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "message" text NOT NULL,
                "isPublished" boolean NOT NULL DEFAULT true,
                "autoDeactivateAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ticker_messages" PRIMARY KEY ("id")
            )
        `);

        // ── activity_logs ──────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "activity_logs" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "action" character varying NOT NULL,
                "resource" character varying NOT NULL,
                "resourceId" character varying,
                "resourceTitle" character varying,
                "description" text NOT NULL,
                "status" character varying NOT NULL DEFAULT 'success',
                "errorMessage" text,
                "metadata" jsonb,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_activity_logs" PRIMARY KEY ("id")
            )
        `);

        // ── push_notification_logs ─────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "push_notification_logs" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying NOT NULL,
                "body" text NOT NULL,
                "url" character varying,
                "source" "push_notification_logs_source_enum" NOT NULL,
                "status" "push_notification_logs_status_enum" NOT NULL DEFAULT 'success',
                "sentCount" integer NOT NULL DEFAULT 0,
                "failedCount" integer NOT NULL DEFAULT 0,
                "errorMessage" text,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_push_notification_logs" PRIMARY KEY ("id")
            )
        `);

        // ── blog_comments (FK → blogs) ─────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "blog_comments" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "blogId" uuid NOT NULL,
                "authorName" character varying(100) NOT NULL,
                "authorEmail" character varying(254) NOT NULL,
                "content" text NOT NULL,
                "isApproved" boolean NOT NULL DEFAULT false,
                "adminNote" text,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_blog_comments" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "blog_comments"
            ADD CONSTRAINT "FK_blog_comments_blogId"
            FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE
        `);

        // ── invoice_items (FK → invoices) ──────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "invoice_items" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "invoiceId" uuid NOT NULL,
                "itemName" character varying NOT NULL,
                "subItem" character varying,
                "category" character varying,
                "quantity" numeric(10,2) NOT NULL DEFAULT 1,
                "unitPrice" numeric(12,2) NOT NULL,
                "total" numeric(12,2) NOT NULL,
                "sortOrder" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_invoice_items" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "invoice_items"
            ADD CONSTRAINT "FK_invoice_items_invoiceId"
            FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE
        `);

        // ── page_views (FK → visitor_sessions) ────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "page_views" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "sessionId" uuid NOT NULL,
                "path" character varying,
                "timeOnPageMs" bigint,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_page_views" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_page_views_sessionId" ON "page_views" ("sessionId")`);
        await queryRunner.query(`
            ALTER TABLE "page_views"
            ADD CONSTRAINT "FK_page_views_sessionId"
            FOREIGN KEY ("sessionId") REFERENCES "visitor_sessions"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "page_views" DROP CONSTRAINT "FK_page_views_sessionId"`);
        await queryRunner.query(`DROP INDEX "IDX_page_views_sessionId"`);
        await queryRunner.query(`DROP TABLE "page_views"`);

        await queryRunner.query(`ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_invoice_items_invoiceId"`);
        await queryRunner.query(`DROP TABLE "invoice_items"`);

        await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_blogId"`);
        await queryRunner.query(`DROP TABLE "blog_comments"`);

        await queryRunner.query(`DROP TABLE "push_notification_logs"`);
        await queryRunner.query(`DROP TABLE "activity_logs"`);
        await queryRunner.query(`DROP TABLE "ticker_messages"`);
        await queryRunner.query(`DROP TABLE "widget_cache"`);
        await queryRunner.query(`DROP INDEX "IDX_visitor_sessions_fingerprint"`);
        await queryRunner.query(`DROP TABLE "visitor_sessions"`);
        await queryRunner.query(`DROP TABLE "fcm_tokens"`);
        await queryRunner.query(`DROP TABLE "login_sessions"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TABLE "feedback"`);
        await queryRunner.query(`DROP TABLE "inquiries"`);
        await queryRunner.query(`DROP TABLE "gallery_items"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TABLE "blogs"`);
        await queryRunner.query(`DROP TABLE "admin_settings"`);
        await queryRunner.query(`DROP TABLE "users"`);

        await queryRunner.query(`DROP TYPE "push_notification_logs_status_enum"`);
        await queryRunner.query(`DROP TYPE "push_notification_logs_source_enum"`);
        await queryRunner.query(`DROP TYPE "inquiries_status_enum"`);
        await queryRunner.query(`DROP TYPE "users_role_enum"`);
    }
}
