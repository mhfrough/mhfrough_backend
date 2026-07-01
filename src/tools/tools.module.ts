import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToolUsageLog } from './tool-usage.entity';
import { ToolsService } from './tools.service';
import { ToolsController } from './tools.controller';
import { ToolsImageService } from './tools-image.service';
import { ToolsImageController } from './tools-image.controller';
import { ToolsGenService } from './tools-gen.service';
import { ToolsGenController } from './tools-gen.controller';

@Module({
    imports: [TypeOrmModule.forFeature([ToolUsageLog])],
    providers: [ToolsService, ToolsImageService, ToolsGenService],
    controllers: [ToolsController, ToolsImageController, ToolsGenController],
    exports: [ToolsService],
})
export class ToolsModule { }
