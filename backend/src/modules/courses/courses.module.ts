import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { GenerationPipelineService } from './generation-pipeline.service';
import { DatabaseModule } from '../../database/database.module';
import { ExamsModule } from '../exams/exams.module';
import { MaterialsModule } from '../materials/materials.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, ExamsModule, MaterialsModule, AiModule],
  controllers: [CoursesController],
  providers: [CoursesService, GenerationPipelineService],
})
export class CoursesModule {}
