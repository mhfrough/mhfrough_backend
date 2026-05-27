import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalleryItem } from './gallery-item.entity';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
    imports: [TypeOrmModule.forFeature([GalleryItem]), ActivityLogModule],
    providers: [GalleryService],
    controllers: [GalleryController],
})
export class GalleryModule { }
