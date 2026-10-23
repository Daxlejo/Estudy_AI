import { Test, TestingModule } from '@nestjs/testing';
import {
  GenerationPipelineService,
  splitIntoChunks,
  CHUNK_SIZE,
  MAX_CHUNKS,
  OVERLAP,
} from './generation-pipeline.service';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { MaterialsService } from '../materials/materials.service';
import { AiService } from '../ai/ai.service';
import { CourseStatus } from '../../domain/models/course';

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

    describe('Chunked Pipeline (> 20,000 chars)', () => {
      it('splitIntoChunks respects CHUNK_SIZE, MAX_CHUNKS, and OVERLAP', () => {
        const text = 'A'.repeat(CHUNK_SIZE * 3);
        const chunks = splitIntoChunks(text);
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks[0].length).toBe(CHUNK_SIZE);
        expect(chunks[1].length).toBe(CHUNK_SIZE);
        // Overlap verification
        const step = CHUNK_SIZE - OVERLAP;
        expect(chunks[1]).toBe(text.slice(step, step + CHUNK_SIZE));

        // Limit to MAX_CHUNKS
        const hugeText = 'X'.repeat(CHUNK_SIZE * 20);
        const hugeChunks = splitIntoChunks(hugeText);
        expect(hugeChunks.length).toBe(MAX_CHUNKS);
      });

      it('processes documents > 20,000 chars and extracts concepts beyond the 20k boundary', async () => {
        // Document of 24,000 characters
        const prefix = 'Intro material content.\n'.repeat(500); // ~12k chars
        const middle = 'Middle material content.\n'.repeat(400); // ~9.6k chars -> total > 21.6k
        const beyondBoundaryText =
          '=== TOPIC_BEYOND_20K ===\nAdvanced Quantum Algorithms and Quantum Circuit Synthesis.';
        const longDocument = `${prefix}${middle}\n${beyondBoundaryText}`;
        expect(longDocument.length).toBeGreaterThan(20000);

        materialsService.getExtractedMaterials.mockResolvedValue([
          {
            materialId: 'm-large',
            name: 'LargeDocument.txt',
            type: 'txt',
            text: longDocument,
          },
        ]);

        // Reset completeJson once-mocks from beforeEach
        aiService.completeJson.mockReset();

        // Handler for completeJson responding differently depending on chunk or prompt
        aiService.completeJson.mockImplementation(
          async (systemPrompt, userMsg) => {
            if (
              typeof systemPrompt === 'string' &&
              systemPrompt.includes('key "sessions"')
            ) {
              return {
                sessions: [
                  {
                    sequenceOrder: 1,
                    title: 'Full Course Session',
                    learningObjective: 'Master introductory and deep concepts',
                    durationMinutes: 45,
                    xpReward: 100,
                    introTitle: 'Overview',
                    introContent:
                      'Comprehensive content covering all concepts.',
                    introKeyTakeaway:
                      'Concepts beyond 20k were successfully processed.',
                    guidedPractice: {
                      type: 'matching',
                      instruction: 'Match concepts',
                      pairs: [
                        { left: 'Quantum', right: 'Circuit' },
                        { left: 'Intro', right: 'Concept' },
                        { left: 'Synthesis', right: 'Algorithms' },
                      ],
                    },
                    challenge: {
                      type: 'multiple_choice',
                      scenario: 'Select the deep concept',
                      instructions: 'Identify which concept was loaded.',
                      options: [
                        {
                          id: '1',
                          text: 'Quantum Circuit Synthesis',
                          isCorrect: true,
                          feedback: 'Correct',
                        },
                        {
                          id: '2',
                          text: 'Other',
                          isCorrect: false,
                          feedback: 'Incorrect',
                        },
                        {
                          id: '3',
                          text: 'Other2',
                          isCorrect: false,
                          feedback: 'Incorrect',
                        },
                        {
                          id: '4',
                          text: 'Other3',
                          isCorrect: false,
                          feedback: 'Incorrect',
                        },
                      ],
                      explanation:
                        'Deep concept was retained beyond 20k characters.',
                    },
                    conceptNames: [
                      'Intro Concept',
                      'Quantum Circuit Synthesis',
                    ],
                  },
                ],
              };
            }

            if (
              typeof systemPrompt === 'string' &&
              systemPrompt.includes('quiz designer')
            ) {
              return {
                passingThreshold: 70,
                questions: [
                  {
                    conceptName: 'Quantum Circuit Synthesis',
                    prompt: 'What is quantum circuit synthesis?',
                    explanation:
                      'Quantum circuit synthesis compiles unitary gates into basic operations.',
                    options: [
                      { id: 'a', text: 'Correct answer', isCorrect: true },
                      { id: 'b', text: 'Wrong', isCorrect: false },
                    ],
                  },
                ],
              };
            }

            if (
              typeof systemPrompt === 'string' &&
              systemPrompt.includes('final comprehensive exam')
            ) {
              return {
                passingThreshold: 70,
                questions: [
                  {
                    prompt: 'Final question',
                    options: [
                      { id: 'a', text: 'Opt A', isCorrect: true },
                      { id: 'b', text: 'Opt B', isCorrect: false },
                    ],
                  },
                ],
              };
            }

            if (
              typeof userMsg === 'string' &&
              userMsg.includes('TOPIC_BEYOND_20K')
            ) {
              return {
                courseSummary:
                  'Comprehensive course covering advanced concepts.',
                concepts: [
                  {
                    name: 'Quantum Circuit Synthesis',
                    summary: 'Deep concept situated beyond the 20k boundary.',
                    detail: 'Detailed description of quantum synthesis.',
                  },
                ],
              };
            }

            // Default for chunk concept extraction
            return {
              courseSummary: 'Introduction course summary.',
              concepts: [
                {
                  name: 'Intro Concept',
                  summary: 'Introductory concept from start of file.',
                  detail: 'Detailed intro content.',
                },
              ],
            };
          },
        );

        await service.run('course-1', 'job-1');

        // Verify the concept beyond 20,000 chars was extracted and persisted
        expect(sessionRepository.addConcept).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'session-1',
            name: 'Quantum Circuit Synthesis',
          }),
        );
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
});
