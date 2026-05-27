import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
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
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
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
  ],
})
export class AppModule { }
