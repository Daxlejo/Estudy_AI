import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { ExamAvailabilityService } from './exam-availability.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ExamsController],
  providers: [
    ExamsService,
    ExamAvailabilityService,
    {
      provide: 'TimeProvider',
      useValue: () => new Date(),
    },
  ],
  exports: [ExamsService, ExamAvailabilityService, 'TimeProvider'],
})
export class ExamsModule {}
