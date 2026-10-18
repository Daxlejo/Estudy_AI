import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.config';
import { PrismaService } from './../src/database/prisma.service';
import { JwtAuthGuard } from './../src/modules/auth/guards/jwt-auth.guard';
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const userId = req.headers['x-test-user-id'] || 'test-user-id';
          req.user = { id: userId, sub: userId };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    await prisma.user.create({
      data: {
        id: 'second-user-id',
        email: 'second@example.com',
        password: 'hashedpassword',
        name: 'Second User',
      },
    });
  }, 60000);

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Also remove test.db-journal if it exists
    if (fs.existsSync(testDbPath + '-journal')) {
      fs.unlinkSync(testDbPath + '-journal');
    }
    const testStoragePath = path.join(__dirname, '..', 'storage');
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
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

    // Create Concepts
    const concept1 = await prisma.concept.create({
      data: {
        sessionId: session1.id,
        name: 'Concept 1',
        summary: 'Sum 1',
        detail: 'Det 1',
      },
    });

    const concept2 = await prisma.concept.create({
      data: {
        sessionId: session2.id,
        name: 'Concept 2',
        summary: 'Sum 2',
        detail: 'Det 2',
      },
    });

    // Create Quizzes for sessions 1 and 2
    const quiz1 = await prisma.quiz.create({
      data: {
        sessionId: session1.id,
        passingThreshold: 100,
      },
    });

    const quiz2 = await prisma.quiz.create({
      data: {
        sessionId: session2.id,
        passingThreshold: 100,
      },
    });

    const question1 = await prisma.quizQuestion.create({
      data: {
        quizId: quiz1.id,
        conceptId: concept1.id,
        prompt: 'What is 2+2?',
        optionsPayload: JSON.stringify([
          { id: 'opt1', text: '3', isCorrect: false },
          { id: 'opt2', text: '4', isCorrect: true },
        ]),
        explanation: 'Because it is 4',
      },
    });

    const question2 = await prisma.quizQuestion.create({
      data: {
        quizId: quiz2.id,
        conceptId: concept2.id,
        prompt: 'What is 3+3?',
        optionsPayload: JSON.stringify([
          { id: 'opt2-1', text: '5', isCorrect: false },
          { id: 'opt2-2', text: '6', isCorrect: true },
        ]),
        explanation: 'Because it is 6',
      },
    });

    // Create Final Exam for course with all 3 question types
    const exam = await prisma.finalExam.create({
      data: {
        courseId,
        passingScorePct: 70,
        estimatedMinutes: 30,
      },
    });

    // 1) MULTIPLE_CHOICE question
    const examQ1 = await prisma.finalExamQuestion.create({
      data: {
        examId: exam.id,
        conceptId: concept1.id,
        type: 'MULTIPLE_CHOICE',
        prompt: 'MC Prompt',
        payload: JSON.stringify({
          type: 'MULTIPLE_CHOICE',
          options: [
            { id: 'm1', text: 'Option M1', isCorrect: false },
            { id: 'm2', text: 'Option M2', isCorrect: true },
          ],
          correctOptionId: 'm2',
        }),
        explanation: 'Explanation MC',
      },
    });

    // 2) MATCHING question
    const examQ2 = await prisma.finalExamQuestion.create({
      data: {
        examId: exam.id,
        conceptId: concept2.id,
        type: 'MATCHING',
        prompt: 'Matching Prompt',
        payload: JSON.stringify({
          type: 'MATCHING',
          leftItems: [
            { id: 'l1', text: 'Left 1' },
            { id: 'l2', text: 'Left 2' },
          ],
          rightItems: [
            { id: 'r1', text: 'Right 1' },
            { id: 'r2', text: 'Right 2' },
          ],
          correctPairs: { l1: 'r1', l2: 'r2' },
        }),
        explanation: 'Explanation Matching',
      },
    });

    // 3) ORDERING question
    const examQ3 = await prisma.finalExamQuestion.create({
      data: {
        examId: exam.id,
        conceptId: concept1.id,
        type: 'ORDERING',
        prompt: 'Ordering Prompt',
        payload: JSON.stringify({
          type: 'ORDERING',
          items: [
            { id: 'o1', text: 'Item 1' },
            { id: 'o2', text: 'Item 2' },
            { id: 'o3', text: 'Item 3' },
          ],
          orderingHint: 'Hint',
          correctOrder: ['o1', 'o2', 'o3'],
        }),
        explanation: 'Explanation Ordering',
      },
    });

    // --- STEP A: Assert Exam is initially LOCKED while sessions are pending ---
    const examLockedRes = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/exam`)
      .expect(200);
    expect(examLockedRes.body.status).toBe('LOCKED');
    expect(examLockedRes.body.questions).toBeUndefined();

    // --- STEP B: Complete Session 1 (Pass Quiz 1) ---
    // 1. GET quiz 1 (verify sanitized)
    const quizRes = await request(app.getHttpServer())
      .get(`/api/sessions/${session1.id}/quiz`)
      .expect(200);
    expect(quizRes.body.questions).toHaveLength(1);
    expect(quizRes.body.questions[0].explanation).toBeUndefined();
    expect(quizRes.body.questions[0].options[0].isCorrect).toBeUndefined();

    // 2. Submit failing attempt for quiz 1
    await request(app.getHttpServer())
      .post(`/api/quizzes/${quiz1.id}/attempts`)
      .send({
        answers: [{ questionId: question1.id, selectedOptionId: 'opt1' }],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.isPassed).toBe(false);
        expect(res.body.score).toBe(0);
        expect(res.body.feedback[0].correctOptionId).toBe('opt2');
      });

    // 3. Complete session 1 should fail (409)
    await request(app.getHttpServer())
      .post(`/api/sessions/${session1.id}/complete`)
      .expect(409);

    // 4. Submit passing attempt for quiz 1
    await request(app.getHttpServer())
      .post(`/api/quizzes/${quiz1.id}/attempts`)
      .send({
        answers: [{ questionId: question1.id, selectedOptionId: 'opt2' }],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.isPassed).toBe(true);
      });

    // 5. Complete session 1 should succeed and unlock session 2
    await request(app.getHttpServer())
      .post(`/api/sessions/${session1.id}/complete`)
      .expect(201);

    // --- STEP C: Complete Session 2 (Pass Quiz 2) ---
    await request(app.getHttpServer())
      .post(`/api/quizzes/${quiz2.id}/attempts`)
      .send({
        answers: [{ questionId: question2.id, selectedOptionId: 'opt2-2' }],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.isPassed).toBe(true);
      });

    await request(app.getHttpServer())
      .post(`/api/sessions/${session2.id}/complete`)
      .expect(201);

    // --- STEP D: GET Exam now that all sessions are completed -> AVAILABLE ---
    const examAvailRes = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/exam`)
      .expect(200);

    expect(examAvailRes.body.status).toBe('AVAILABLE');
    expect(examAvailRes.body.questions).toHaveLength(3);

    // Assert no answer key and no explanation for any type
    const qMC = examAvailRes.body.questions.find(
      (q: any) => q.type === 'MULTIPLE_CHOICE',
    );
    expect(qMC.explanation).toBeUndefined();
    expect(qMC.payload.correctOptionId).toBeUndefined();
    expect(qMC.payload.options[0].isCorrect).toBeUndefined();
    expect(qMC.payload.options[1].isCorrect).toBeUndefined();

    const qMat = examAvailRes.body.questions.find(
      (q: any) => q.type === 'MATCHING',
    );
    expect(qMat.explanation).toBeUndefined();
    expect(qMat.payload.correctPairs).toBeUndefined();
    expect(qMat.payload.leftItems).toHaveLength(2);
    expect(qMat.payload.rightItems).toHaveLength(2);

    const qOrd = examAvailRes.body.questions.find(
      (q: any) => q.type === 'ORDERING',
    );
    expect(qOrd.explanation).toBeUndefined();
    expect(qOrd.payload.correctOrder).toBeUndefined();
    expect(qOrd.payload.items).toHaveLength(3);

    // --- STEP E: Submit failing exam attempt -> Cooldown set ---
    const failExamRes = await request(app.getHttpServer())
      .post(`/api/exams/${exam.id}/attempts`)
      .send({
        answers: [
          { questionId: examQ1.id, studentPayload: { selectedOptionId: 'm1' } }, // wrong
          {
            questionId: examQ2.id,
            studentPayload: { pairs: { l1: 'r2', l2: 'r1' } },
          }, // wrong
          {
            questionId: examQ3.id,
            studentPayload: { orderedIds: ['o3', 'o2', 'o1'] },
          }, // wrong
        ],
      })
      .expect(201);

    expect(failExamRes.body.isPassed).toBe(false);
    expect(failExamRes.body.score).toBe(0);
    expect(failExamRes.body.cooldownUntil).not.toBeNull();

    // --- STEP F: Second submit inside cooldown returns 409 Conflict ---
    await request(app.getHttpServer())
      .post(`/api/exams/${exam.id}/attempts`)
      .send({
        answers: [
          { questionId: examQ1.id, studentPayload: { selectedOptionId: 'm2' } },
        ],
      })
      .expect(409);

    // --- STEP G: Move cooldownUntil to the past via PrismaService ---
    await prisma.finalExam.update({
      where: { id: exam.id },
      data: { cooldownUntil: new Date(Date.now() - 60000) },
    });

    // --- STEP H: Submit passing exam attempt -> Course status COMPLETED ---
    const passExamRes = await request(app.getHttpServer())
      .post(`/api/exams/${exam.id}/attempts`)
      .send({
        answers: [
          { questionId: examQ1.id, studentPayload: { selectedOptionId: 'm2' } },
          {
            questionId: examQ2.id,
            studentPayload: { pairs: { l1: 'r1', l2: 'r2' } },
          },
          {
            questionId: examQ3.id,
            studentPayload: { orderedIds: ['o1', 'o2', 'o3'] },
          },
        ],
      })
      .expect(201);

    expect(passExamRes.body.isPassed).toBe(true);
    expect(passExamRes.body.score).toBe(100);
    expect(passExamRes.body.attemptNumber).toBe(2);
    expect(passExamRes.body.cooldownUntil).toBeNull();

    // Verify course status in DB is COMPLETED
    const courseAfterPass = await prisma.course.findUnique({
      where: { id: courseId },
    });
    expect(courseAfterPass?.status).toBe('COMPLETED');

    // --- STEP I: GET attempts returns stored attempts ---
    const attemptsRes = await request(app.getHttpServer())
      .get(`/api/exams/${exam.id}/attempts`)
      .expect(200);
    expect(attemptsRes.body).toHaveLength(2);

    // --- STEP J: GET Progress shows finalExam ---
    const progressFinalRes = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/progress`)
      .expect(200);
    expect(progressFinalRes.body.finalExam).toBeDefined();
    expect(progressFinalRes.body.finalExam.status).toBe('AVAILABLE');
    expect(progressFinalRes.body.finalExam.bestScorePercent).toBe(100);
    expect(progressFinalRes.body.finalExam.attemptsCount).toBe(2);
    expect(progressFinalRes.body.finalExam.cooldownUntil).toBeNull();
  }, 60000);

  it('Generation job lifecycle: generate and get status via API (e2e)', async () => {
    // 1. Course not found returns 404
    await request(app.getHttpServer())
      .post('/api/courses/non-existent-course/generate')
      .send({})
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/courses/non-existent-course/generation-status')
      .expect(404);

    // 2. Create course
    const courseRes = await request(app.getHttpServer())
      .post('/api/courses')
      .send({ name: 'E2E Gen Course', description: 'Testing generation job' })
      .expect(201);
    const courseId = courseRes.body.id;

    // 3. Course exists but has no generation jobs yet -> returns 404
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/generation-status`)
      .expect(404);

    // 4. Trigger generation with invalid material ID -> returns 400
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/generate`)
      .send({ materialIds: ['00000000-0000-0000-0000-000000000000'] })
      .expect(400);

    // 5. Trigger generation -> returns 201 with PENDING job
    const genRes = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/generate`)
      .send({})
      .expect(201);

    expect(genRes.body.id).toBeDefined();
    expect(genRes.body.courseId).toBe(courseId);
    expect(genRes.body.status).toBe('PENDING');
    expect(genRes.body.progress).toBe(0);

    // The pipeline runs asynchronously via setImmediate.
    // Without uploaded materials it fails immediately, so by the time
    // we poll the course may already be in ERROR state.
    // Give the event loop a tick so the pipeline settles.
    await new Promise((r) => setTimeout(r, 200));

    // 6. Course status should now be ERROR (no materials uploaded)
    const courseInDb = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}`)
      .expect(200);
    expect(courseInDb.body.status).toBe('ERROR');

    // 7. Poll generation status -> returns 200 with ERROR state
    const statusRes = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/generation-status`)
      .expect(200);

    expect(statusRes.body.jobId).toBe(genRes.body.id);
    expect(statusRes.body.courseId).toBe(courseId);
    expect(statusRes.body.courseName).toBe('E2E Gen Course');
    expect(statusRes.body.status).toBe('ERROR');
    expect(statusRes.body.errorMessage).toBeDefined();
    // Verify no secrets or student answer keys are exposed in generation status
    expect(JSON.stringify(statusRes.body)).not.toContain('correctOptionId');
    expect(JSON.stringify(statusRes.body)).not.toContain('isCorrect');
    expect(JSON.stringify(statusRes.body)).not.toContain('Bearer');
    expect(statusRes.body.steps).toHaveLength(5);
    expect(statusRes.body.steps[0].key).toBe('EXTRACTION');
    // First step should be marked as error since extraction found no materials
    expect(statusRes.body.steps[0].status).toBe('error');
    expect(statusRes.body.metrics).toEqual({
      sessionsCount: 0,
      conceptsCount: 0,
      levelsCount: 0,
    });
  });

  it('Material ingestion lifecycle: upload valid materials, reject invalid inputs, persist metadata (e2e)', async () => {
    const prisma = app.get(PrismaService);

    // 1. Create a dedicated course
    const courseRes = await request(app.getHttpServer())
      .post('/api/courses')
      .send({
        name: 'E2E Materials Course',
        description: 'Testing material upload',
      })
      .expect(201);
    const courseId = courseRes.body.id;

    // 2. Upload to non-existent course -> 404
    await request(app.getHttpServer())
      .post('/api/courses/non-existent-course/materials')
      .attach('file', Buffer.from('# Intro to Algorithms'), 'notes.md')
      .expect(404);

    // 3. Upload without file attached -> 400
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/materials`)
      .expect(400);

    // 4. Upload empty file -> 400
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/materials`)
      .attach('file', Buffer.alloc(0), 'empty.txt')
      .expect(400);

    // 5. Upload unsupported type (.pdf) -> 415
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/materials`)
      .attach('file', Buffer.from('%PDF-1.4 sample'), 'slides.pdf')
      .expect(415);

    // 6. Upload binary/malformed UTF-8 -> 422
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/materials`)
      .attach('file', Buffer.from([0xff, 0xfe, 0xfd]), 'bad.txt')
      .expect(422);

    // 7. Upload valid markdown (.md) -> 201
    const mdContent =
      '# Sorting Algorithms\n\nQuicksort and mergesort are divide and conquer.';
    const mdRes = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/materials`)
      .attach('file', Buffer.from(mdContent, 'utf-8'), 'algorithms.md')
      .expect(201);

    expect(mdRes.body.id).toBeDefined();
    expect(mdRes.body.courseId).toBe(courseId);
    expect(mdRes.body.name).toBe('algorithms.md');
    expect(mdRes.body.type).toBe('md');
    expect(mdRes.body.sizeBytes).toBe(Buffer.byteLength(mdContent, 'utf-8'));
    expect(mdRes.body.extractedCharacters).toBe(mdContent.length);
    expect(mdRes.body.uploadedAt).toBeDefined();
    expect(mdRes.body.storagePath).toBeUndefined();

    // 8. Upload valid plain text (.txt) -> 201
    const txtContent =
      'Binary Search Trees\n\nSearch time is O(log n) on average.';
    const txtRes = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/materials`)
      .attach('file', Buffer.from(txtContent, 'utf-8'), 'trees.txt')
      .expect(201);

    expect(txtRes.body.id).toBeDefined();
    expect(txtRes.body.courseId).toBe(courseId);
    expect(txtRes.body.name).toBe('trees.txt');
    expect(txtRes.body.type).toBe('txt');
    expect(txtRes.body.sizeBytes).toBe(Buffer.byteLength(txtContent, 'utf-8'));
    expect(txtRes.body.extractedCharacters).toBe(txtContent.length);

    // 9. Verify database has persisted both materials
    const storedMaterials = await prisma.material.findMany({
      where: { courseId },
      orderBy: { name: 'asc' },
    });
    expect(storedMaterials).toHaveLength(2);
    expect(storedMaterials[0].name).toBe('algorithms.md');
    expect(storedMaterials[1].name).toBe('trees.txt');
  });

  it('Course update and safe deletion lifecycle (e2e)', async () => {
    const prisma = app.get(PrismaService);

    // 1. Create a course
    const courseRes = await request(app.getHttpServer())
      .post('/api/courses')
      .send({
        name: 'Original Course Name',
        description: 'Original Description',
      })
      .expect(201);
    const courseId = courseRes.body.id;

    // 2. Update course metadata (PATCH)
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/courses/${courseId}`)
      .send({
        name: 'Updated Course Name',
        description: 'Updated Description',
      })
      .expect(200);

    expect(patchRes.body.id).toBe(courseId);
    expect(patchRes.body.name).toBe('Updated Course Name');
    expect(patchRes.body.description).toBe('Updated Description');

    // 3. Verify get returns updated metadata
    const getRes = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}`)
      .expect(200);
    expect(getRes.body.name).toBe('Updated Course Name');
    expect(getRes.body.description).toBe('Updated Description');

    // 4. Seed session, concept, quiz, quiz question (with Restrict)
    const session = await prisma.session.create({
      data: {
        courseId,
        sequenceOrder: 1,
        title: 'Session For Delete Test',
        learningObjective: 'Test Cascade Delete',
        durationMinutes: 15,
        isUnlocked: true,
        introTitle: 'Intro',
        introContent: 'Content',
        introKeyTakeaway: 'Key',
        guidedPractice: 'Practice',
        challenge: 'Challenge',
      },
    });

    const concept = await prisma.concept.create({
      data: {
        sessionId: session.id,
        name: 'Restricted Concept',
        summary: 'Concept with Restrict relation',
        detail: 'Detail',
      },
    });

    const quiz = await prisma.quiz.create({
      data: {
        sessionId: session.id,
        passingThreshold: 100,
      },
    });

    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        conceptId: concept.id,
        prompt: 'Restricted question?',
        optionsPayload: JSON.stringify([
          { id: 'o1', text: 'Ans', isCorrect: true },
        ]),
        explanation: 'Exp',
      },
    });

    // 5. Upload a material to verify filesystem directory exists
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/materials`)
      .attach('file', Buffer.from('# Storage File Test', 'utf-8'), 'notes.md')
      .expect(201);

    // 6. Test conflict prevention when PROCESSING
    await prisma.course.update({
      where: { id: courseId },
      data: { status: 'PROCESSING' },
    });

    await request(app.getHttpServer())
      .delete(`/api/courses/${courseId}`)
      .expect(409);

    // Reset status to READY
    await prisma.course.update({
      where: { id: courseId },
      data: { status: 'READY' },
    });

    // 7. Delete course -> should execute ordered cascade without hitting onDelete: Restrict
    await request(app.getHttpServer())
      .delete(`/api/courses/${courseId}`)
      .expect(200);

    // 8. Verify course and all related records are completely gone
    const courseInDb = await prisma.course.findUnique({
      where: { id: courseId },
    });
    expect(courseInDb).toBeNull();

    const sessionsInDb = await prisma.session.findMany({
      where: { courseId },
    });
    expect(sessionsInDb).toHaveLength(0);

    const questionsInDb = await prisma.quizQuestion.findMany({
      where: { conceptId: concept.id },
    });
    expect(questionsInDb).toHaveLength(0);

    // 9. Deleting already-deleted course returns 404
    await request(app.getHttpServer())
      .delete(`/api/courses/${courseId}`)
      .expect(404);
  });

  it('Multi-user isolation: second account cannot read, mutate, generate, or delete first account course', async () => {
    // 1. First account creates a private course
    const courseRes = await request(app.getHttpServer())
      .post('/api/courses')
      .send({ name: 'Private User 1 Course', description: 'Confidential' })
      .expect(201);

    const courseId = courseRes.body.id;
    expect(courseId).toBeDefined();

    // 2. Second account listing courses: should NOT include first account's course
    await request(app.getHttpServer())
      .get('/api/courses')
      .set('x-test-user-id', 'second-user-id')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        const ids = res.body.map((c: any) => c.id);
        expect(ids).not.toContain(courseId);
      });

    // 3. Second account GET course detail: 403 Forbidden
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    // 4. Second account GET course progress: 403 Forbidden
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/progress`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    // 5. Second account POST generate: 403 Forbidden
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/generate`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    // 6. Second account PATCH update: 403 Forbidden
    await request(app.getHttpServer())
      .patch(`/api/courses/${courseId}`)
      .set('x-test-user-id', 'second-user-id')
      .send({ name: 'Malicious Rename' })
      .expect(403);

    // 7. Second account DELETE: 403 Forbidden
    await request(app.getHttpServer())
      .delete(`/api/courses/${courseId}`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    // 8. Second account POST upload material: 403 Forbidden
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/materials`)
      .set('x-test-user-id', 'second-user-id')
      .attach('file', Buffer.from('test content'), 'test.txt')
      .expect(403);

    // 9. First account CAN update and delete their own course
    await request(app.getHttpServer())
      .patch(`/api/courses/${courseId}`)
      .send({ name: 'Updated by Owner' })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('Updated by Owner');
      });

    await request(app.getHttpServer())
      .delete(`/api/courses/${courseId}`)
      .expect(200);
  });

  it('Multi-user IDOR isolation: child resources (sessions, quizzes, exams, attempts) reject cross-user access', async () => {
    const prisma = app.get(PrismaService);

    // 1. First account creates a course
    const courseRes = await request(app.getHttpServer())
      .post('/api/courses')
      .send({
        name: 'User 1 Protected Course',
        description: 'Deep security test',
      })
      .expect(201);

    const courseId = courseRes.body.id;

    // 2. Seed child resources for this course
    const session = await prisma.session.create({
      data: {
        id: 'session-idor-1',
        courseId,
        sequenceOrder: 1,
        title: 'IDOR Session 1',
        learningObjective: 'Security validation',
        durationMinutes: 10,
        xpReward: 50,
        isUnlocked: true,
        introTitle: 'Intro',
        introContent: 'Content',
        introKeyTakeaway: 'Takeaway',
        guidedPractice: 'Practice',
        challenge: 'Challenge',
      },
    });

    const quiz = await prisma.quiz.create({
      data: {
        id: 'quiz-idor-1',
        sessionId: session.id,
        passingThreshold: 70,
        xpReward: 100,
      },
    });

    const exam = await prisma.finalExam.create({
      data: {
        id: 'exam-idor-1',
        courseId,
        passingScorePct: 70,
        estimatedMinutes: 20,
      },
    });

    // 3. Second account attempting to access sessions: 403 Forbidden
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/sessions`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/complete`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    // 4. Second account attempting to access quizzes: 403 Forbidden
    await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}/quiz`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/quizzes/${quiz.id}`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/quizzes/${quiz.id}/attempts`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .set('x-test-user-id', 'second-user-id')
      .send({ answers: [] })
      .expect(403);

    // 5. Second account attempting to access final exam: 403 Forbidden
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/exam`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/exams/${exam.id}/attempts`)
      .set('x-test-user-id', 'second-user-id')
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/exams/${exam.id}/attempts`)
      .set('x-test-user-id', 'second-user-id')
      .send({ answers: [] })
      .expect(403);

    // Verify course status was not mutated
    const refreshedCourse = await prisma.course.findUnique({
      where: { id: courseId },
    });
    expect(refreshedCourse?.status).not.toBe('COMPLETED');

    // 6. First account CAN access their own child resources
    await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/sessions`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}`)
      .expect(200);

    // Cleanup
    await request(app.getHttpServer())
      .delete(`/api/courses/${courseId}`)
      .expect(200);
  });

  it('Legacy unowned courses (userId: null) are inaccessible and protected from modification', async () => {
    const prisma = app.get(PrismaService);

    // 1. Create an unowned legacy course directly in DB
    const legacyCourse = await prisma.course.create({
      data: {
        id: 'legacy-unowned-e2e',
        name: 'Legacy Unowned Course',
        description: 'Orphaned from previous version',
        status: 'READY',
        userId: null,
      },
    });

    // 2. Any user attempting GET course: 403 Forbidden
    await request(app.getHttpServer())
      .get(`/api/courses/${legacyCourse.id}`)
      .expect(403);

    // 3. Any user attempting GET progress: 403 Forbidden
    await request(app.getHttpServer())
      .get(`/api/courses/${legacyCourse.id}/progress`)
      .expect(403);

    // 4. Any user attempting PATCH update: 403 Forbidden
    await request(app.getHttpServer())
      .patch(`/api/courses/${legacyCourse.id}`)
      .send({ name: 'Malicious Hijack' })
      .expect(403);

    // 5. Any user attempting DELETE: 403 Forbidden
    await request(app.getHttpServer())
      .delete(`/api/courses/${legacyCourse.id}`)
      .expect(403);

    // 6. Verify course still exists in DB untouched
    const stillExists = await prisma.course.findUnique({
      where: { id: legacyCourse.id },
    });
    expect(stillExists).not.toBeNull();
    expect(stillExists?.name).toBe('Legacy Unowned Course');
    expect(stillExists?.userId).toBeNull();

    // Clean up test record directly
    await prisma.course.delete({ where: { id: legacyCourse.id } });
  });
});
