import { Test, TestingModule } from '@nestjs/testing';
import { GenerationPipelineService } from './generation-pipeline.service';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { MaterialsService } from '../materials/materials.service';
import { AiService } from '../ai/ai.service';
import { CourseStatus } from '../../domain/models/course';
import {
  aiSessionPlanResponseSchema,
  normalizeSessionPlan,
  normalizeSessionItem,
} from './dto/ai-course-plan.dto';

describe('GenerationPipelineService', () => {
  let service: GenerationPipelineService;
  let courseRepository: jest.Mocked<CourseRepository>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let quizRepository: jest.Mocked<QuizRepository>;
  let finalExamRepository: jest.Mocked<FinalExamRepository>;
  let materialsService: jest.Mocked<MaterialsService>;
  let aiService: jest.Mocked<AiService>;

  const makeCourse = (
    overrides: { status?: CourseStatus } & Record<string, unknown> = {},
  ) => ({
    id: 'course-1',
    name: 'Test Course',
    status: 'PROCESSING' as CourseStatus,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    courseRepository = {
      findById: jest.fn().mockResolvedValue(makeCourse()),
      update: jest.fn().mockResolvedValue({}),
      updateGenerationJob: jest.fn().mockResolvedValue({}),
    } as any;

    sessionRepository = {
      create: jest.fn(),
      addConcept: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    } as any;

    quizRepository = {
      create: jest.fn(),
      addQuestion: jest.fn(),
    } as any;

    finalExamRepository = {
      create: jest.fn(),
      addQuestion: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    } as any;

    materialsService = {
      getExtractedMaterials: jest.fn(),
    } as any;

    aiService = {
      completeJson: jest.fn(),
      completeText: jest
        .fn()
        .mockResolvedValue('VALID_EDUCATIONAL: Good content'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationPipelineService,
        { provide: 'CourseRepository', useValue: courseRepository },
        { provide: 'SessionRepository', useValue: sessionRepository },
        { provide: 'QuizRepository', useValue: quizRepository },
        { provide: 'FinalExamRepository', useValue: finalExamRepository },
        { provide: MaterialsService, useValue: materialsService },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();

    service = module.get<GenerationPipelineService>(GenerationPipelineService);
  });

  describe('run — failure cases and error recovery', () => {
    it('should abort pipeline immediately and set course status to FAILED when content validation returns INVALID', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        {
          materialId: 'mat-1',
          name: 'recipe.txt',
          type: 'txt',
          text: 'Receta para hacer pastel de chocolate: mezclar harina, azúcar y huevos.',
        },
      ]);

      aiService.completeText = jest
        .fn()
        .mockResolvedValue(
          'INVALID: The text is a cooking recipe and is unsuitable for an educational learning course.',
        );

      await service.run('course-1', 'job-1');

      expect(aiService.completeText).toHaveBeenCalledWith(
        expect.stringContaining('You are a content validator'),
        expect.stringContaining('Receta para hacer pastel de chocolate'),
      );

      // Should abort immediately without calling completeJson for concepts
      expect(aiService.completeJson).not.toHaveBeenCalled();

      // Generation job must be marked as FAILED with the reason as errorMessage
      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'FAILED',
          errorMessage:
            'The text is a cooking recipe and is unsuitable for an educational learning course.',
        }),
      );

      // Course status must be set to FAILED
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'FAILED',
      });
    });

    it('should truncate sample text to first 2000 characters for content validation', async () => {
      const hugeMaterialText = 'A'.repeat(5000);
      materialsService.getExtractedMaterials.mockResolvedValue([
        {
          materialId: 'mat-1',
          name: 'huge.txt',
          type: 'txt',
          text: hugeMaterialText,
        },
      ]);

      aiService.completeText = jest
        .fn()
        .mockResolvedValue('VALID_EDUCATIONAL: Technical content');

      // Throw inside concept extraction to stop after validation
      aiService.completeJson.mockRejectedValue(new Error('Stop after validation'));

      await service.run('course-1', 'job-1');

      expect(aiService.completeText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/^=== huge\.txt ===\n/i),
      );
      const passedSample = (aiService.completeText as jest.Mock).mock.calls[0][1];
      expect(passedSample.length).toBeLessThanOrEqual(2000);
    });

    it('should set job ERROR and course ERROR when course does not exist', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await service.run('missing-course', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining(
            'Course with id missing-course not found',
          ),
        }),
      );
      expect(courseRepository.update).toHaveBeenCalledWith('missing-course', {
        status: 'ERROR',
      });
    });

    it('should set job ERROR and course ERROR when no materials are found', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([]);

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({ status: 'ERROR' }),
      );
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'ERROR',
      });
    });

    it('should set job ERROR when material retrieval rejects for invalid material IDs', async () => {
      materialsService.getExtractedMaterials.mockRejectedValue(
        new Error(
          'Material IDs [invalid-mat] do not belong to course course-1',
        ),
      );

      await service.run('course-1', 'job-1', ['invalid-mat']);

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining('Material IDs [invalid-mat]'),
        }),
      );
    });

    it('should reject invalid concepts schema before persistence', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson.mockResolvedValue({ concepts: [] });

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining('invalid concepts response'),
        }),
      );
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should reject invalid session plan schema before persistence', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson
        .mockResolvedValueOnce({
          concepts: [{ name: 'C1', summary: 'Summary 1', detail: 'Detail 1' }],
        })
        .mockResolvedValueOnce({
          sessions: [], // empty sessions
        });

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining('invalid session plan'),
        }),
      );
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should reject session plan when guidedPractice and challenge payloads are identical (R5)', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson
        .mockResolvedValueOnce({
          concepts: [{ name: 'C1', summary: 'Summary 1', detail: 'Detail 1' }],
        })
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'S1',
              learningObjective: 'Obj',
              durationMinutes: 20,
              xpReward: 50,
              introTitle: 'Intro',
              introContent: 'Content',
              introKeyTakeaway: 'Takeaway',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'A', right: 'B' }],
              }),
              challenge: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'A', right: 'B' }],
              }),
              conceptNames: ['C1'],
            },
          ],
        });

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining(
            'identical guidedPractice and challenge',
          ),
        }),
      );
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should reject session plan when guidedPractice and challenge have substantively duplicate matching pairs despite different titles and IDs', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson
        .mockResolvedValueOnce({
          concepts: [
            {
              name: 'Clase',
              summary: 'Plantilla de objetos',
              detail: 'Detail 1',
            },
            {
              name: 'Objeto',
              summary: 'Instancia de clase',
              detail: 'Detail 2',
            },
          ],
        })
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'S1',
              learningObjective: 'Obj',
              durationMinutes: 20,
              xpReward: 50,
              introTitle: 'Intro',
              introContent: 'Content',
              introKeyTakeaway: 'Takeaway',
              guidedPractice: JSON.stringify({
                id: 'gp-1',
                type: 'matching',
                title: 'Práctica: Emparejamiento',
                pairs: [
                  { id: '1', left: 'Clase', right: 'Plantilla de objetos' },
                  { id: '2', left: 'Objeto', right: 'Instancia de clase' },
                ],
              }),
              challenge: JSON.stringify({
                id: 'ch-1',
                type: 'matching',
                title: 'Desafío: Vinculación',
                pairs: [
                  { id: 'a', left: 'Objeto', right: 'Instancia de clase' },
                  { id: 'b', left: 'Clase', right: 'Plantilla de objetos' },
                ],
              }),
              conceptNames: ['Clase', 'Objeto'],
            },
          ],
        });

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining(
            'identical guidedPractice and challenge',
          ),
        }),
      );
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should accept session plan when guidedPractice and challenge use distinct activity types', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      sessionRepository.create.mockResolvedValue({ id: 'session-1' } as any);
      sessionRepository.addConcept.mockResolvedValue({
        id: 'concept-1',
      } as any);
      quizRepository.create.mockResolvedValue({ id: 'quiz-1' } as any);
      finalExamRepository.create.mockResolvedValue({ id: 'exam-1' } as any);

      aiService.completeJson
        .mockResolvedValueOnce({
          concepts: [
            {
              name: 'Clase',
              summary: 'Plantilla de objetos',
              detail: 'Detail 1',
            },
            {
              name: 'Objeto',
              summary: 'Instancia de clase',
              detail: 'Detail 2',
            },
          ],
        })
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'S1',
              learningObjective: 'Obj',
              durationMinutes: 20,
              xpReward: 50,
              introTitle: 'Intro',
              introContent: 'Content',
              introKeyTakeaway: 'Takeaway',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [
                  { id: '1', left: 'Clase', right: 'Plantilla de objetos' },
                  { id: '2', left: 'Objeto', right: 'Instancia de clase' },
                ],
              }),
              challenge: JSON.stringify({
                type: 'multiple_choice',
                question: '¿Qué componente debe instanciarse en memoria?',
                options: [
                  { id: 'opt-1', text: 'Objeto', isCorrect: true },
                  { id: 'opt-2', text: 'Clase', isCorrect: false },
                ],
              }),
              conceptNames: ['Clase', 'Objeto'],
            },
          ],
        })
        .mockResolvedValueOnce({
          // Quiz response
          passingThreshold: 70,
          questions: [
            {
              conceptName: 'Clase',
              prompt: 'Pregunta de quiz',
              options: [
                { id: '1', text: 'Opción A', isCorrect: true },
                { id: '2', text: 'Opción B', isCorrect: false },
              ],
              explanation: 'Explicación del quiz',
            },
          ],
        })
        .mockResolvedValueOnce({
          // Final exam response
          passingScorePct: 70,
          estimatedMinutes: 30,
          questions: [
            {
              conceptName: 'Clase',
              type: 'MULTIPLE_CHOICE',
              prompt: 'Pregunta de examen',
              payload: {
                type: 'MULTIPLE_CHOICE',
                options: [
                  { id: '1', text: 'Opción A', isCorrect: true },
                  { id: '2', text: 'Opción B', isCorrect: false },
                ],
                correctOptionId: '1',
              },
              explanation: 'Explicación final',
            },
          ],
        });

      await service.run('course-1', 'job-1');

      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'S1',
        }),
      );
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'READY',
      });
    });

    it('should reject quiz questions lacking a correct option before persistence', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson
        .mockResolvedValueOnce({
          concepts: [
            { name: 'Variables', summary: 'Var summary', detail: 'Var detail' },
          ],
        })
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'S1',
              learningObjective: 'Obj',
              durationMinutes: 20,
              xpReward: 50,
              introTitle: 'Intro',
              introContent: 'Content',
              introKeyTakeaway: 'Takeaway',
              guidedPractice: 'Practice',
              challenge: 'Challenge',
              conceptNames: ['Variables'],
            },
          ],
        })
        .mockResolvedValueOnce({
          passingThreshold: 70,
          questions: [
            {
              conceptName: 'Variables',
              prompt: 'Question without correct answer?',
              options: [
                { id: '1', text: 'Option 1', isCorrect: false },
                { id: '2', text: 'Option 2', isCorrect: false },
              ],
              explanation: 'Exp',
            },
          ],
        });

      sessionRepository.create.mockResolvedValue({ id: 's-1' } as any);
      sessionRepository.addConcept.mockResolvedValue({ id: 'c-1' } as any);

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining('invalid quiz'),
        }),
      );
      expect(quizRepository.create).not.toHaveBeenCalled();
      // Partial persistence rollback check: created session should be deleted!
      expect(sessionRepository.delete).toHaveBeenCalledWith('s-1');
    });

    it('should handle AI provider rate limits (429) gracefully', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson.mockRejectedValue(
        new Error(
          'AI provider rate limit reached (429). Please retry in a few moments.',
        ),
      );

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining('rate limit reached (429)'),
        }),
      );
    });

    it('should handle AI provider timeouts gracefully', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson.mockRejectedValue(
        new Error(
          'AI provider request timed out. Please retry in a few moments.',
        ),
      );

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining('request timed out'),
        }),
      );
    });

    it('should sanitize API keys and secrets in recorded error messages', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson.mockRejectedValue(
        new Error(
          'Unauthorized with key sk-proj-1234567890abcdef1234567890 and Bearer secret-token-xyz',
        ),
      );

      await service.run('course-1', 'job-1');

      const lastCall = courseRepository.updateGenerationJob.mock.calls.at(-1)!;
      expect(lastCall[1].errorMessage).not.toContain(
        'sk-proj-1234567890abcdef1234567890',
      );
      expect(lastCall[1].errorMessage).toContain('[REDACTED_API_KEY]');
      expect(lastCall[1].errorMessage).toContain('Bearer [REDACTED]');
    });

    it('should rollback partially created sessions and exam when persistence fails', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue([
        { materialId: 'm1', name: 'notes.txt', type: 'txt', text: 'Some text' },
      ]);
      aiService.completeJson
        .mockResolvedValueOnce({
          concepts: [{ name: 'C1', summary: 'Sum 1', detail: 'Det 1' }],
        })
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'S1',
              learningObjective: 'Obj',
              durationMinutes: 20,
              xpReward: 50,
              introTitle: 'Intro',
              introContent: 'Content',
              introKeyTakeaway: 'Key',
              guidedPractice: 'Prac',
              challenge: 'Chal',
              conceptNames: ['C1'],
            },
          ],
        });

      sessionRepository.create.mockResolvedValue({ id: 's-rollback-1' } as any);
      sessionRepository.addConcept.mockRejectedValue(
        new Error('DB failure on concept'),
      );

      await service.run('course-1', 'job-1');

      expect(sessionRepository.delete).toHaveBeenCalledWith('s-rollback-1');
      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: 'DB failure on concept',
        }),
      );
    });
  });

  describe('run — happy path', () => {
    const extractedMaterials = [
      {
        materialId: 'm1',
        name: 'chapter1.txt',
        type: 'txt',
        text: 'Algebra content',
      },
    ];

    const aiConcepts = {
      concepts: [
        {
          name: 'Variables',
          summary: 'Symbolic placeholders',
          detail: 'A variable represents a value...',
          example: 'x = 5',
        },
        {
          name: 'Equations',
          summary: 'Mathematical expressions',
          detail: 'An equation equates two expressions...',
        },
      ],
    };

    const aiSessions = {
      sessions: [
        {
          sequenceOrder: 1,
          title: 'Intro to Algebra',
          learningObjective: 'Understand variables',
          durationMinutes: 20,
          xpReward: 50,
          introTitle: 'What is Algebra?',
          introContent: 'Algebra is a branch of mathematics...',
          introKeyTakeaway: 'Variables represent unknown values.',
          guidedPractice: 'Solve for x: x + 2 = 5',
          challenge: 'Solve a system of equations.',
          conceptNames: ['Variables', 'Equations'],
        },
      ],
    };

    const aiQuiz = {
      passingThreshold: 70,
      questions: [
        {
          conceptName: 'Variables',
          prompt: 'What does a variable represent?',
          options: [
            { id: 'a', text: 'A constant', isCorrect: false },
            { id: 'b', text: 'An unknown value', isCorrect: true },
          ],
          explanation: 'Variables stand for unknown values.',
        },
      ],
    };

    const aiFinalExam = {
      estimatedMinutes: 30,
      passingScorePct: 70,
      questions: [
        {
          conceptName: 'Variables',
          type: 'MULTIPLE_CHOICE',
          prompt: 'What is a variable?',
          payload: {
            type: 'MULTIPLE_CHOICE',
            options: [
              { id: 'x', text: 'A constant', isCorrect: false },
              { id: 'y', text: 'A placeholder', isCorrect: true },
            ],
            correctOptionId: 'y',
          },
          explanation: 'A variable is a placeholder.',
        },
      ],
    };

    beforeEach(() => {
      materialsService.getExtractedMaterials.mockResolvedValue(
        extractedMaterials,
      );

      // Mock AI: concepts → sessions → quiz → final exam
      aiService.completeJson
        .mockResolvedValueOnce(aiConcepts)
        .mockResolvedValueOnce(aiSessions)
        .mockResolvedValueOnce(aiQuiz)
        .mockResolvedValueOnce(aiFinalExam);

      sessionRepository.create.mockResolvedValue({
        id: 'session-1',
        courseId: 'course-1',
        sequenceOrder: 1,
        title: 'Intro to Algebra',
      } as any);

      sessionRepository.addConcept
        .mockResolvedValueOnce({
          id: 'concept-variables',
          name: 'Variables',
        } as any)
        .mockResolvedValueOnce({
          id: 'concept-equations',
          name: 'Equations',
        } as any);

      quizRepository.create.mockResolvedValue({ id: 'quiz-1' } as any);
      quizRepository.addQuestion.mockResolvedValue({ id: 'qq-1' } as any);

      finalExamRepository.create.mockResolvedValue({ id: 'exam-1' } as any);
      finalExamRepository.addQuestion.mockResolvedValue({ id: 'fq-1' } as any);

      courseRepository.update.mockResolvedValue(
        makeCourse({ status: 'READY' }),
      );
    });

    it('should complete the pipeline and set job COMPLETED + course READY', async () => {
      await service.run('course-1', 'job-1');

      // Final job update should be COMPLETED at 100%
      const completedCall =
        courseRepository.updateGenerationJob.mock.calls.find(
          ([, data]) => data.status === 'COMPLETED',
        );
      expect(completedCall).toBeDefined();
      expect(completedCall![1]).toMatchObject({
        status: 'COMPLETED',
        progress: 100,
      });

      // Course should be set to READY
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'READY',
      });
    });

    it('should create one session with two concepts', async () => {
      await service.run('course-1', 'job-1');

      expect(sessionRepository.create).toHaveBeenCalledTimes(1);
      expect(sessionRepository.addConcept).toHaveBeenCalledTimes(2);
    });

    it('should create a quiz for the session', async () => {
      await service.run('course-1', 'job-1');

      expect(quizRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          passingThreshold: 70,
        }),
      );
      expect(quizRepository.addQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          quizId: 'quiz-1',
          conceptId: 'concept-variables',
          correctOptionIndex: expect.any(Number),
          options: expect.arrayContaining([
            expect.objectContaining({ id: 'a', isCorrect: false }),
            expect.objectContaining({ id: 'b', isCorrect: true }),
          ]),
        }),
      );
    });

    it('should create a final exam with one question', async () => {
      await service.run('course-1', 'job-1');

      expect(finalExamRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-1',
          passingScorePct: 70,
          estimatedMinutes: 30,
        }),
      );
      expect(finalExamRepository.addQuestion).toHaveBeenCalledTimes(1);
    });

    it('should progress job through EXTRACTING → ANALYZING_CONCEPTS → ANALYZING_DEPENDENCIES → BUILDING_PATH → COMPLETED', async () => {
      await service.run('course-1', 'job-1');

      const statuses = courseRepository.updateGenerationJob.mock.calls.map(
        ([, data]) => data.status,
      );
      expect(statuses).toContain('EXTRACTING');
      expect(statuses).toContain('ANALYZING_CONCEPTS');
      expect(statuses).toContain('ANALYZING_DEPENDENCIES');
      expect(statuses).toContain('BUILDING_PATH');
      expect(statuses).toContain('COMPLETED');
    });

    it('should unlock only the first session', async () => {
      await service.run('course-1', 'job-1');

      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isUnlocked: true, sequenceOrder: 1 }),
      );
    });

    it('should pass materialIds to materialsService when specified', async () => {
      await service.run('course-1', 'job-1', ['m1']);

      expect(materialsService.getExtractedMaterials).toHaveBeenCalledWith(
        'course-1',
        ['m1'],
      );
    });

    it('should instruct AI to generate content in English when language="en" is passed', async () => {
      await service.run('course-1', 'job-1', ['m1'], 'en');

      expect(aiService.completeJson).toHaveBeenCalledTimes(4);
      for (const [systemPrompt] of aiService.completeJson.mock.calls) {
        expect(systemPrompt).toContain(
          'IMPORTANT: Generate ALL content (summaries, titles, explanations, exercises, questions, options, and feedback) in English.',
        );
      }
    });

    it('should instruct AI to generate content in Spanish by default', async () => {
      await service.run('course-1', 'job-1', ['m1']);

      expect(aiService.completeJson).toHaveBeenCalledTimes(4);
      for (const [systemPrompt] of aiService.completeJson.mock.calls) {
        expect(systemPrompt).toContain(
          'IMPORTANTE: Genera TODO el contenido (resúmenes, títulos, explicaciones, ejercicios, preguntas, opciones y retroalimentación) en Español.',
        );
      }
    });

    it('splits text into overlapping chunks respecting limits', () => {
      const text = 'A'.repeat(15000);
      const chunks = service.splitIntoChunks(text);
      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(6000);
      expect(chunks[1].length).toBe(6000);
      expect(chunks[2].length).toBe(3400);
    });

    it('should process a document > 20,000 chars and extract concepts from beyond the 20,000-char boundary', async () => {
      const padding = 'Section intro. '.repeat(1400); // ~21,000 chars
      const textBeyondBoundary =
        padding + '\n\nKey Topic: Advanced Quantum Teleportation Protocol';

      materialsService.getExtractedMaterials.mockResolvedValue([
        {
          materialId: 'mat-large',
          name: 'large_document.txt',
          type: 'txt',
          text: textBeyondBoundary,
        },
      ]);

      const chunks = service.splitIntoChunks(textBeyondBoundary);
      expect(chunks.length).toBeGreaterThan(3);

      aiService.completeJson.mockReset();
      chunks.forEach((chunk, index) => {
        if (chunk.includes('Advanced Quantum Teleportation Protocol')) {
          aiService.completeJson.mockResolvedValueOnce({
            courseSummary: 'Summary of quantum teleportation',
            concepts: [
              {
                name: 'Quantum Teleportation',
                summary: 'Protocol beyond 20k characters',
                detail: 'Detail explaining quantum states',
              },
            ],
          });
        } else {
          aiService.completeJson.mockResolvedValueOnce({
            courseSummary: 'Introductory material summary',
            concepts: [
              {
                name: 'Concept Chunk ' + (index + 1),
                summary: 'Summary of chunk ' + (index + 1),
                detail: 'Detail of chunk ' + (index + 1),
              },
            ],
          });
        }
      });

      aiService.completeJson.mockResolvedValueOnce({
        sessions: [
          {
            sequenceOrder: 1,
            title: 'Quantum Protocols',
            learningObjective: 'Understand teleportation',
            durationMinutes: 30,
            xpReward: 100,
            introTitle: 'Intro',
            introContent: 'Content',
            introKeyTakeaway: 'Takeaway',
            guidedPractice: '{"type":"matching"}',
            challenge: '{"type":"multiple_choice"}',
            conceptNames: ['Quantum Teleportation'],
          },
        ],
      });

      aiService.completeJson
        .mockResolvedValueOnce(aiQuiz)
        .mockResolvedValueOnce(aiFinalExam);

      sessionRepository.create.mockResolvedValue({ id: 's-large' } as any);
      sessionRepository.addConcept.mockResolvedValue({ id: 'c-large' } as any);

      await service.run('course-1', 'job-1');

      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Quantum Teleportation',
          summary: 'Protocol beyond 20k characters',
        }),
      );
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'READY',
      });
    });
  });

  describe('session plan normalization and conceptNames contract (hotfix regression)', () => {
    const makeExtracted = () => [
      {
        materialId: 'm1',
        name: 'poo.txt',
        type: 'txt',
        text: 'Clases y Objetos en POO',
      },
    ];

    const makeExtractedConcepts = () => ({
      concepts: [
        {
          name: 'Clase',
          summary: 'Plantilla de objetos',
          detail: 'Definicion de clase',
        },
        {
          name: 'Objeto',
          summary: 'Instancia de clase',
          detail: 'Definicion de objeto',
        },
        {
          name: 'Herencia',
          summary: 'Jerarquia de clases',
          detail: 'Definicion de herencia',
        },
      ],
    });

    const standardQuiz = {
      passingThreshold: 75,
      questions: [
        {
          conceptName: 'Clase',
          prompt: 'Que es una clase?',
          options: [
            { id: '1', text: 'Una plantilla', isCorrect: true },
            { id: '2', text: 'Una variable simple', isCorrect: false },
          ],
          explanation: 'Una clase es un molde o plantilla.',
        },
      ],
    };

    const standardExam = {
      estimatedMinutes: 30,
      passingScorePct: 70,
      questions: [
        {
          conceptName: 'Clase',
          type: 'MULTIPLE_CHOICE',
          prompt: 'Concepto de clase',
          payload: {
            type: 'MULTIPLE_CHOICE',
            options: [
              { id: 'a', text: 'Molde', isCorrect: true },
              { id: 'b', text: 'Instancia', isCorrect: false },
            ],
            correctOptionId: 'a',
          },
          explanation: 'Molde que define atributos y metodos.',
        },
      ],
    };

    beforeEach(() => {
      quizRepository.create.mockResolvedValue({ id: 'quiz-1' } as any);
      quizRepository.addQuestion.mockResolvedValue({ id: 'qq-1' } as any);
      finalExamRepository.create.mockResolvedValue({ id: 'exam-1' } as any);
      finalExamRepository.addQuestion.mockResolvedValue({ id: 'fq-1' } as any);
      sessionRepository.create.mockResolvedValue({ id: 'sess-1' } as any);
      sessionRepository.addConcept.mockResolvedValue({ id: 'c-1' } as any);
      courseRepository.update.mockResolvedValue(
        makeCourse({ status: 'READY' }),
      );
    });

    it('should validate and persist session when AI provides standard conceptNames array', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue(makeExtracted());
      aiService.completeJson
        .mockResolvedValueOnce(makeExtractedConcepts())
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'Fundamentos de POO',
              learningObjective: 'Dominar clases y objetos',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Introduccion a POO',
              introContent: 'La POO organiza el software en clases y objetos.',
              introKeyTakeaway:
                'Las clases definen el molde y los objetos las instancias.',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'Clase', right: 'Molde' }],
              }),
              challenge: JSON.stringify({
                type: 'multiple_choice',
                instructions: 'Responde la pregunta',
                options: [{ id: '1', text: 'Opt', isCorrect: true }],
              }),
              conceptNames: ['Clase', 'Objeto'],
            },
          ],
        })
        .mockResolvedValueOnce(standardQuiz)
        .mockResolvedValueOnce(standardExam);

      sessionRepository.create.mockResolvedValue({ id: 'sess-1' } as any);
      sessionRepository.addConcept.mockResolvedValue({ id: 'c-1' } as any);

      await service.run('course-1', 'job-1');

      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fundamentos de POO',
        }),
      );
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Clase' }),
      );
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Objeto' }),
      );
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'READY',
      });
    });

    it('should normalize and validate session when AI provides concepts string array instead of conceptNames', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue(makeExtracted());
      aiService.completeJson
        .mockResolvedValueOnce(makeExtractedConcepts())
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'Fundamentos de POO',
              learningObjective: 'Dominar clases y objetos',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Introduccion a POO',
              introContent: 'La POO organiza el software en clases y objetos.',
              introKeyTakeaway: 'Las clases definen el molde.',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'Clase', right: 'Molde' }],
              }),
              challenge: JSON.stringify({
                type: 'multiple_choice',
                instructions: 'Responde la pregunta',
                options: [{ id: '1', text: 'Opt', isCorrect: true }],
              }),
              concepts: ['Clase', 'Objeto'],
            },
          ],
        })
        .mockResolvedValueOnce(standardQuiz)
        .mockResolvedValueOnce(standardExam);

      sessionRepository.create.mockResolvedValue({ id: 'sess-1' } as any);
      sessionRepository.addConcept.mockResolvedValue({ id: 'c-1' } as any);

      await service.run('course-1', 'job-1');

      expect(sessionRepository.create).toHaveBeenCalled();
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Clase' }),
      );
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Objeto' }),
      );
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'READY',
      });
    });

    it('should normalize and validate session when AI provides concepts array of objects with name property', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue(makeExtracted());
      aiService.completeJson
        .mockResolvedValueOnce(makeExtractedConcepts())
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'Fundamentos de POO',
              learningObjective: 'Dominar clases y objetos',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Introduccion a POO',
              introContent: 'Contenido...',
              introKeyTakeaway: 'Takeaway...',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'Clase', right: 'Molde' }],
              }),
              challenge: JSON.stringify({
                type: 'multiple_choice',
                instructions: 'Responde',
                options: [{ id: '1', text: 'Opt', isCorrect: true }],
              }),
              concepts: [{ name: 'Clase' }, { name: 'Objeto' }],
            },
          ],
        })
        .mockResolvedValueOnce(standardQuiz)
        .mockResolvedValueOnce(standardExam);

      sessionRepository.create.mockResolvedValue({ id: 'sess-1' } as any);
      sessionRepository.addConcept.mockResolvedValue({ id: 'c-1' } as any);

      await service.run('course-1', 'job-1');

      expect(sessionRepository.create).toHaveBeenCalled();
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Clase' }),
      );
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Objeto' }),
      );
    });

    it('should normalize and validate session when AI provides concept_names (snake_case)', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue(makeExtracted());
      aiService.completeJson
        .mockResolvedValueOnce(makeExtractedConcepts())
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'Fundamentos de POO',
              learningObjective: 'Dominar clases y objetos',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Intro',
              introContent: 'Content',
              introKeyTakeaway: 'Takeaway',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'Clase', right: 'Molde' }],
              }),
              challenge: JSON.stringify({
                type: 'multiple_choice',
                instructions: 'Responde',
                options: [{ id: '1', text: 'Opt', isCorrect: true }],
              }),
              concept_names: ['Clase', 'Objeto'],
            },
          ],
        })
        .mockResolvedValueOnce(standardQuiz)
        .mockResolvedValueOnce(standardExam);

      sessionRepository.create.mockResolvedValue({ id: 'sess-1' } as any);
      sessionRepository.addConcept.mockResolvedValue({ id: 'c-1' } as any);

      await service.run('course-1', 'job-1');

      expect(sessionRepository.create).toHaveBeenCalled();
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Clase' }),
      );
    });

    it('should reject session plan when conceptNames and all equivalent fields are missing (reproducing original bug)', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue(makeExtracted());
      aiService.completeJson
        .mockResolvedValueOnce(makeExtractedConcepts())
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'Sesion sin conceptos',
              learningObjective: 'Objetivo',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Intro',
              introContent: 'Content',
              introKeyTakeaway: 'Takeaway',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'A', right: 'B' }],
              }),
              challenge: JSON.stringify({
                type: 'multiple_choice',
                instructions: 'Responde',
                options: [{ id: '1', text: 'Opt', isCorrect: true }],
              }),
              // Missing conceptNames and concepts entirely
            },
          ],
        });

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringMatching(
            /conceptNames|invalid session plan/i,
          ),
        }),
      );
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should reject session plan when concepts array is empty', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue(makeExtracted());
      aiService.completeJson
        .mockResolvedValueOnce(makeExtractedConcepts())
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'Sesion con array vacio',
              learningObjective: 'Objetivo',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Intro',
              introContent: 'Content',
              introKeyTakeaway: 'Takeaway',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'A', right: 'B' }],
              }),
              challenge: JSON.stringify({
                type: 'multiple_choice',
                instructions: 'Responde',
                options: [{ id: '1', text: 'Opt', isCorrect: true }],
              }),
              concepts: [],
            },
          ],
        });

      await service.run('course-1', 'job-1');

      expect(courseRepository.updateGenerationJob).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: expect.stringContaining(
            'Session must include at least one concept',
          ),
        }),
      );
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should normalize and validate all sessions in a multi-session plan with diverse naming conventions', async () => {
      materialsService.getExtractedMaterials.mockResolvedValue(makeExtracted());
      aiService.completeJson
        .mockResolvedValueOnce(makeExtractedConcepts())
        .mockResolvedValueOnce({
          sessions: [
            {
              sequenceOrder: 1,
              title: 'Sesion 1',
              learningObjective: 'Obj 1',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Intro 1',
              introContent: 'Content 1',
              introKeyTakeaway: 'Takeaway 1',
              guidedPractice: JSON.stringify({
                type: 'matching',
                pairs: [{ id: '1', left: 'Clase', right: 'Molde' }],
              }),
              challenge: JSON.stringify({
                type: 'multiple_choice',
                instructions: 'Responde',
                options: [{ id: '1', text: 'Opt', isCorrect: true }],
              }),
              conceptNames: ['Clase'],
            },
            {
              sequenceOrder: 2,
              title: 'Sesion 2',
              learningObjective: 'Obj 2',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Intro 2',
              introContent: 'Content 2',
              introKeyTakeaway: 'Takeaway 2',
              guidedPractice: JSON.stringify({
                type: 'true_false',
                statement: 'Un objeto es instancia de clase',
                correct: true,
                justification: 'Asi es',
              }),
              challenge: JSON.stringify({
                type: 'classify',
                categories: ['Cat1', 'Cat2'],
                items: [
                  { label: 'Item1', correctCategory: 'Cat1' },
                  { label: 'Item2', correctCategory: 'Cat2' },
                ],
                explanation: 'Explicacion',
              }),
              concepts: ['Objeto'],
            },
            {
              sequenceOrder: 3,
              title: 'Sesion 3',
              learningObjective: 'Obj 3',
              durationMinutes: 30,
              xpReward: 100,
              introTitle: 'Intro 3',
              introContent: 'Content 3',
              introKeyTakeaway: 'Takeaway 3',
              guidedPractice: JSON.stringify({
                type: 'fill_in_blank',
                sentence: 'La herencia permite crear jerarquias',
                blanks: [{ index: 0, answer: 'herencia' }],
                explanation: 'Explicacion',
              }),
              challenge: JSON.stringify({
                type: 'ordering',
                items: [
                  { id: '1', text: 'Base' },
                  { id: '2', text: 'Derivada' },
                ],
                correctOrder: ['1', '2'],
              }),
              concept_names: ['Herencia'],
            },
          ],
        })
        .mockResolvedValueOnce(standardQuiz)
        .mockResolvedValueOnce(standardQuiz)
        .mockResolvedValueOnce(standardQuiz)
        .mockResolvedValueOnce(standardExam);

      sessionRepository.create
        .mockResolvedValueOnce({ id: 's1' } as any)
        .mockResolvedValueOnce({ id: 's2' } as any)
        .mockResolvedValueOnce({ id: 's3' } as any);
      sessionRepository.addConcept.mockResolvedValue({ id: 'c-any' } as any);

      await service.run('course-1', 'job-1');

      expect(sessionRepository.create).toHaveBeenCalledTimes(3);
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Clase' }),
      );
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Objeto' }),
      );
      expect(sessionRepository.addConcept).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Herencia' }),
      );
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'READY',
      });
    });

    describe('DTO unit parsing and normalization', () => {
      const baseSession = {
        sequenceOrder: 1,
        title: 'Session Test',
        learningObjective: 'Learning Obj',
        durationMinutes: 30,
        xpReward: 100,
        introTitle: 'Intro',
        introContent: 'Content',
        introKeyTakeaway: 'Takeaway',
        guidedPractice: 'Practice text',
        challenge: 'Challenge text',
      };

      it('should parse directly with conceptNames array', () => {
        const payload = {
          sessions: [{ ...baseSession, conceptNames: ['Alpha', 'Beta'] }],
        };
        const result = aiSessionPlanResponseSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sessions[0].conceptNames).toEqual([
            'Alpha',
            'Beta',
          ]);
        }
      });

      it('should normalize and parse with concepts string array', () => {
        const payload = {
          sessions: [{ ...baseSession, concepts: ['Alpha', 'Beta'] }],
        };
        const result = aiSessionPlanResponseSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sessions[0].conceptNames).toEqual([
            'Alpha',
            'Beta',
          ]);
        }
      });

      it('should normalize and parse with concepts object array', () => {
        const payload = {
          sessions: [
            { ...baseSession, concepts: [{ name: 'Alpha' }, { name: 'Beta' }] },
          ],
        };
        const result = aiSessionPlanResponseSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sessions[0].conceptNames).toEqual([
            'Alpha',
            'Beta',
          ]);
        }
      });

      it('should normalize top-level array directly passed to normalizeSessionPlan', () => {
        const rawArray = [{ ...baseSession, concepts: ['Alpha'] }];
        const normalized = normalizeSessionPlan(rawArray) as {
          sessions: Array<{ conceptNames: string[] }>;
        };
        expect(Array.isArray(normalized.sessions)).toBe(true);
        expect(normalized.sessions[0].conceptNames).toEqual(['Alpha']);
      });

      it('should normalize individual session item using normalizeSessionItem', () => {
        const item = { ...baseSession, concepts: ['Alpha'] };
        const normalized = normalizeSessionItem(item) as {
          conceptNames: string[];
        };
        expect(normalized.conceptNames).toEqual(['Alpha']);
      });

      it('should fail validation when conceptNames is completely absent and no alternatives exist', () => {
        const payload = {
          sessions: [{ ...baseSession }],
        };
        const result = aiSessionPlanResponseSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should include explicit rule in systemPromptSessions forbidding compound numbered multiple_choice and requiring classify', () => {
        const prompt = (
          service as unknown as {
            systemPromptSessions: (lang: string) => string;
          }
        ).systemPromptSessions('es');
        expect(prompt).toContain('1. ... 2. ... 3. ...');
        expect(prompt).toContain("use 'classify'");
      });

      describe('Quiz Generation Quality and Option Shuffling (Prompt 2)', () => {
        it('should instruct AI in systemPromptQuiz to avoid obvious options and represent misconceptions', () => {
          const prompt = (
            service as unknown as {
              systemPromptQuiz: (lang: string) => string;
            }
          ).systemPromptQuiz('es');
          expect(prompt).toContain(
            'Make each distractor represent a genuinely different (and common) misconception',
          );
          expect(prompt).toContain(
            'Avoid options that differ only in one word at the end of an otherwise identical sentence',
          );
          expect(prompt).toContain('Vary the length and structure of options');
        });

        it('should perform Fisher-Yates shuffle on quiz options and update correctOptionIndex', () => {
          const options = [
            { id: 'opt-1', text: 'Correct Answer', isCorrect: true },
            { id: 'opt-2', text: 'Distractor 1', isCorrect: false },
            { id: 'opt-3', text: 'Distractor 2', isCorrect: false },
            { id: 'opt-4', text: 'Distractor 3', isCorrect: false },
          ];

          const randomSpy = jest
            .spyOn(Math, 'random')
            .mockReturnValueOnce(0.0)
            .mockReturnValueOnce(0.5)
            .mockReturnValueOnce(0.9);

          const { shuffledOptions, correctOptionIndex } =
            service.shuffleQuizOptions(options, 0);

          randomSpy.mockRestore();

          expect(shuffledOptions[3].id).toBe('opt-1');
          expect(shuffledOptions[3].isCorrect).toBe(true);
          expect(correctOptionIndex).toBe(3);
        });

        it('should maintain elements during Fisher-Yates array shuffle', () => {
          const arr = [1, 2, 3, 4, 5];
          const shuffled = service.shuffleArray(arr);
          expect(shuffled).toHaveLength(arr.length);
          expect(shuffled.slice().sort()).toEqual(arr.slice().sort());
        });
      });
    });
  });
});
