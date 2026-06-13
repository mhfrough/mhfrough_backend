import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { BlogsModule } from './blogs/blogs.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AdminModule } from './admin/admin.module';
import { BlogCommentsModule } from './blog-comments/blog-comments.module';
import { FcmModule } from './fcm/fcm.module';
import { ChatModule } from './chat/chat.module';
import { EventsModule } from './events/events.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadModule } from './upload/upload.module';
import { AdminSettingsModule } from './admin-settings/admin-settings.module';
import { LoginSessionsModule } from './login-sessions/login-sessions.module';
import { GalleryModule } from './gallery/gallery.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { TickerModule } from './ticker/ticker.module';
import { VisitorsModule } from './visitors/visitors.module';
import { WidgetsModule } from './widgets/widgets.module';
import { HealthModule } from './health/health.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { LeadsModule } from './leads/leads.module';
import { EmailModule } from './email/email.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminDataModule } from './admin-data/admin-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    CacheModule.register({ isGlobal: true, ttl: 5 * 60 * 1000 }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        migrationsRun: config.get('NODE_ENV') === 'production',
        migrations: [__dirname + '/migrations/*.js'],
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    UsersModule,
    ProjectsModule,
    BlogsModule,
    InquiriesModule,
    FeedbackModule,
    AdminModule,
    BlogCommentsModule,
    ChatModule,
    FcmModule,
    EventsModule,
    InvoicesModule,
    ActivityLogModule,
    UploadModule,
    AdminSettingsModule,
    LoginSessionsModule,
    GalleryModule,
    SiteSettingsModule,
    TickerModule,
    VisitorsModule,
    WidgetsModule,
    HealthModule,
    AppointmentsModule,
    LeadsModule,
    EmailModule,
    AnalyticsModule,
    AdminDataModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Activates the per-endpoint @Throttle() limits (login, unlock, visitor pings)
    // and applies the 100/min default everywhere else. HTTP-only so it doesn't
    // break the WebSocket gateways.
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
  ],
})
export class AppModule { }
