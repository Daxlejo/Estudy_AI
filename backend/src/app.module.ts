import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';

@Module({
  imports: [DatabaseModule, CoursesModule, SessionsModule, QuizzesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
