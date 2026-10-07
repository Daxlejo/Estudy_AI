import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaCourseRepository } from './repositories/prisma-course.repository';
import { PrismaSessionRepository } from './repositories/prisma-session.repository';
import { PrismaQuizRepository } from './repositories/prisma-quiz.repository';
import { PrismaFinalExamRepository } from './repositories/prisma-final-exam.repository';

@Module({
  providers: [
    PrismaService,
    {
      provide: 'CourseRepository',
      useClass: PrismaCourseRepository,
    },
    {
      provide: 'SessionRepository',
      useClass: PrismaSessionRepository,
    },
    {
      provide: 'QuizRepository',
      useClass: PrismaQuizRepository,
    },
    {
      provide: 'FinalExamRepository',
      useClass: PrismaFinalExamRepository,
    },
  ],
  exports: [
    PrismaService,
    'CourseRepository',
    'SessionRepository',
    'QuizRepository',
    'FinalExamRepository',
  ],
})
export class DatabaseModule {}
