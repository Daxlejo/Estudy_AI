import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.config';
import { PrismaService } from './../src/database/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('CoursesController (e2e)', () => {
  let app: INestApplication;
  const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');

  beforeAll(async () => {
    // Ensure test database starts completely clean
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbPath + '-journal')) {
      fs.unlinkSync(testDbPath + '-journal');
    }

    process.env.DATABASE_URL = 'file:./test.db';

    // Run migrations
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: 'file:./test.db' },
      stdio: 'inherit',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Also remove test.db-journal if it exists
    if (fs.existsSync(testDbPath + '-journal')) {
      fs.unlinkSync(testDbPath + '-journal');
    }
  });

  it('/api/courses (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/courses')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/api/courses (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/courses')
      .send({ name: 'Test Course E2E', description: 'desc e2e' })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('Test Course E2E');
        expect(res.body.id).toBeDefined();
      });
  });

  it('Quiz full flow (create, seed, get quiz, fail attempt, pass attempt, progress)', async () => {
    // 1. Create Course
    const courseRes = await request(app.getHttpServer())
      .post('/api/courses')
      .send({ name: 'Quiz Course', description: 'Course for quiz testing' })
      .expect(201);
    const courseId = courseRes.body.id;

    // We will directly seed two sessions and a quiz via the Prisma service.
    const prisma = app.get(PrismaService);

    // Create session 1
    const session1 = await prisma.session.create({
      data: {
        courseId,
        sequenceOrder: 1,
        title: 'Session 1',
        learningObjective: 'Obj 1',
        durationMinutes: 10,
        isUnlocked: true,
        introTitle: 'Intro 1',
        introContent: 'Content 1',
        introKeyTakeaway: 'Key 1',
        guidedPractice: 'Prac 1',
        challenge: 'Chal 1',
      },
    });

    // Create session 2
    const session2 = await prisma.session.create({
      data: {
        courseId,
        sequenceOrder: 2,
        title: 'Session 2',
        learningObjective: 'Obj 2',
        durationMinutes: 10,
        isUnlocked: false,
        introTitle: 'Intro 2',
        introContent: 'Content 2',
        introKeyTakeaway: 'Key 2',
        guidedPractice: 'Prac 2',
        challenge: 'Chal 2',
      },
    });

    // Create Concept for session 1
    const concept = await prisma.concept.create({
      data: {
        sessionId: session1.id,
        name: 'Concept 1',
        summary: 'Sum',
        detail: 'Det',
      },
    });

    // Create Quiz for session 1
    const quiz = await prisma.quiz.create({
      data: {
        sessionId: session1.id,
        passingThreshold: 100, // require 100%
      },
    });

    // Add a Question to the Quiz
    const question = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        conceptId: concept.id,
        prompt: 'What is 2+2?',
        optionsPayload: JSON.stringify([
          { id: 'opt1', text: '3', isCorrect: false },
          { id: 'opt2', text: '4', isCorrect: true },
        ]),
        explanation: 'Because it is 4',
      },
    });

    // 2. GET the quiz (assert no correct answers or explanations)
    const quizRes = await request(app.getHttpServer())
      .get(`/api/sessions/${session1.id}/quiz`)
      .expect(200);

    expect(quizRes.body.questions).toHaveLength(1);
    expect(quizRes.body.questions[0].explanation).toBeUndefined();
    expect(quizRes.body.questions[0].options[0].isCorrect).toBeUndefined();
    expect(quizRes.body.questions[0].options[1].isCorrect).toBeUndefined();

    // 3. Submit a failing attempt
    await request(app.getHttpServer())
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        answers: [{ questionId: question.id, selectedOptionId: 'opt1' }],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.isPassed).toBe(false);
        expect(res.body.score).toBe(0);
        // Correct option and explanation are revealed only after submission
        expect(res.body.feedback).toHaveLength(1);
        expect(res.body.feedback[0].correctOptionId).toBe('opt2');
        expect(res.body.feedback[0].correctOptionText).toBe('4');
        expect(res.body.feedback[0].isCorrect).toBe(false);
        expect(res.body.feedback[0].explanation).toBe('Because it is 4');
      });

    // Complete session should fail (409) since we failed the quiz
    await request(app.getHttpServer())
      .post(`/api/sessions/${session1.id}/complete`)
      .expect(409);

    // Verify session 2 is still locked
    const progressFailing = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/progress`)
      .expect(200);
    const sess2Failing = progressFailing.body.sessions.find(
      (s: any) => s.id === session2.id,
    );
    expect(sess2Failing.isUnlocked).toBe(false);

    // 4. Submit a passing attempt
    await request(app.getHttpServer())
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        answers: [{ questionId: question.id, selectedOptionId: 'opt2' }],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.isPassed).toBe(true);
        expect(res.body.score).toBe(100);
        expect(res.body.feedback).toHaveLength(1);
        expect(res.body.feedback[0].correctOptionId).toBe('opt2');
        expect(res.body.feedback[0].correctOptionText).toBe('4');
        expect(res.body.feedback[0].isCorrect).toBe(true);
        expect(res.body.feedback[0].explanation).toBe('Because it is 4');
      });

    // Complete session should now succeed
    await request(app.getHttpServer())
      .post(`/api/sessions/${session1.id}/complete`)
      .expect(201);

    // 5. GET progress and verify session 2 is unlocked
    const progressPassing = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/progress`)
      .expect(200);

    const sess2Passing = progressPassing.body.sessions.find(
      (s: any) => s.id === session2.id,
    );
    expect(sess2Passing.isUnlocked).toBe(true);
    const sess1Passing = progressPassing.body.sessions.find(
      (s: any) => s.id === session1.id,
    );
    expect(sess1Passing.isCompleted).toBe(true);
  });
});
