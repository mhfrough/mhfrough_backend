import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorSession } from './visitor-session.entity';
import { PageView } from './page-view.entity';
import { VisitorsService } from './visitors.service';
import { VisitorsController } from './visitors.controller';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [TypeOrmModule.forFeature([VisitorSession, PageView]), EventsModule],
    providers: [VisitorsService],
    controllers: [VisitorsController],
    exports: [VisitorsService],
})
export class VisitorsModule { }
