import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blog } from './blog.entity';
import { BlogsService } from './blogs.service';
import { BlogsController } from './blogs.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
    imports: [TypeOrmModule.forFeature([Blog]), ActivityLogModule],
    providers: [BlogsService],
    controllers: [BlogsController],
    exports: [BlogsService],
})
export class BlogsModule { }
