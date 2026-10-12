import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { DatabaseModule } from '../../database/database.module';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [DatabaseModule, ExamsModule],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
