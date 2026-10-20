import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { ExamsModule } from './modules/exams/exams.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { AuthModule } from './modules/auth/auth.module';

/**
 * Production build of the React SPA. The Electron shell injects
 * FRONTEND_DIST_DIR; otherwise the monorepo layout is assumed.
 * Only registered when the build exists, so dev (Vite on :5173) is unaffected.
 */
const FRONTEND_DIST_DIR = path.resolve(
  process.env.FRONTEND_DIST_DIR ||
    path.join(process.cwd(), '..', 'frontend', 'dist'),
);
const staticFrontend = existsSync(path.join(FRONTEND_DIST_DIR, 'index.html'))
  ? [
      ServeStaticModule.forRoot({
        rootPath: FRONTEND_DIST_DIR,
        exclude: ['/api/(.*)'],
      }),
    ]
  : [];

@Module({
  imports: [
    ...staticFrontend,
    DatabaseModule,
    AuthModule,
    CoursesModule,
    SessionsModule,
    QuizzesModule,
    ExamsModule,
    MaterialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
