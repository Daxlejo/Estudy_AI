import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamAvailabilityService } from './exam-availability.service';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { CourseRepository } from '../../domain/repositories/course.repository';
import {
  FinalExam,
  FinalExamQuestion,
  FinalExamAttempt,
} from '../../domain/models/final-exam';

describe('ExamsService', () => {
  let service: ExamsService;
  let finalExamRepository: jest.Mocked<FinalExamRepository>;
  let courseRepository: jest.Mocked<CourseRepository>;
  let examAvailabilityService: jest.Mocked<ExamAvailabilityService>;

  const mockExam: FinalExam = {
    id: 'exam-1',
    courseId: 'course-1',
    passingScorePct: 70,
    estimatedMinutes: 30,
    cooldownUntil: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockMcQuestion: FinalExamQuestion = {
    id: 'q-mc',
    examId: 'exam-1',
    conceptId: 'c1',
    type: 'MULTIPLE_CHOICE',
    prompt: 'Prompt MC',
    context: null,
    payload: {
      type: 'MULTIPLE_CHOICE',
      options: [
        { id: 'opt1', text: 'Option 1' },
        { id: 'opt2', text: 'Option 2' },
      ],
      correctOptionId: 'opt2',
    },
    explanation: 'Explanation MC',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockMatchingQuestion: FinalExamQuestion = {
    id: 'q-mat',
    examId: 'exam-1',
    conceptId: 'c2',
    type: 'MATCHING',
    prompt: 'Prompt Matching',
    context: null,
    payload: {
      type: 'MATCHING',
      leftItems: [
        { id: 'l1', text: 'Left 1' },
        { id: 'l2', text: 'Left 2' },
      ],
      rightItems: [
        { id: 'r1', text: 'Right 1' },
        { id: 'r2', text: 'Right 2' },
      ],
      correctPairs: {
        l1: 'r1',
        l2: 'r2',
      },
    },
    explanation: 'Explanation Matching',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockOrderingQuestion: FinalExamQuestion = {
    id: 'q-ord',
    examId: 'exam-1',
    conceptId: 'c3',
    type: 'ORDERING',
    prompt: 'Prompt Ordering',
    context: null,
    payload: {
      type: 'ORDERING',
      items: [
        { id: 'i1', text: 'Item 1' },
        { id: 'i2', text: 'Item 2' },
        { id: 'i3', text: 'Item 3' },
      ],
      orderingHint: 'Hint',
      correctOrder: ['i1', 'i2', 'i3'],
    },
    explanation: 'Explanation Ordering',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const allThreeQuestions: FinalExamQuestion[] = [
    mockMcQuestion,
    mockMatchingQuestion,
    mockOrderingQuestion,
  ];

  beforeEach(async () => {
    finalExamRepository = {
      findById: jest.fn(),
      findByCourseId: jest.fn(),
      findByCourseIdWithQuestions: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addQuestion: jest.fn(),
      getQuestionsByExamId: jest.fn(),
      createAttempt: jest.fn(),
      getAttemptsByCourseId: jest.fn(),
      getAttemptsByExamId: jest.fn(),
      getAttemptById: jest.fn(),
      updateCooldownUntil: jest.fn(),
    } as any;

    courseRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    examAvailabilityService = {
      checkAvailability: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: 'FinalExamRepository', useValue: finalExamRepository },
        { provide: 'CourseRepository', useValue: courseRepository },
        {
          provide: ExamAvailabilityService,
          useValue: examAvailabilityService,
        },
        {
          provide: 'TimeProvider',
          useValue: () => new Date('2026-01-01T10:00:00Z'),
        },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
  });

  describe('getExamByCourse', () => {
    it('should return LOCKED status and pendingSessionsCount when sessions are pending (no questions leaked)', async () => {
      finalExamRepository.findByCourseIdWithQuestions.mockResolvedValue({
        ...mockExam,
        questions: allThreeQuestions,
      });
      examAvailabilityService.checkAvailability.mockResolvedValue({
        status: 'LOCKED',
        pendingSessionsCount: 2,
        cooldownUntil: null,
        exam: mockExam,
      });

      const result = await service.getExamByCourse('course-1');

      expect(result.status).toBe('LOCKED');
      expect(result.pendingSessionsCount).toBe(2);
      expect(result.questions).toBeUndefined();
    });

    it('should return COOLDOWN status and cooldownUntil when cooldown is active (no questions leaked)', async () => {
      const cooldownDate = new Date('2026-01-01T11:00:00Z');
      finalExamRepository.findByCourseIdWithQuestions.mockResolvedValue({
        ...mockExam,
        cooldownUntil: cooldownDate,
        questions: allThreeQuestions,
      });
      examAvailabilityService.checkAvailability.mockResolvedValue({
        status: 'COOLDOWN',
        pendingSessionsCount: 0,
        cooldownUntil: cooldownDate,
        exam: mockExam,
      });

      const result = await service.getExamByCourse('course-1');

      expect(result.status).toBe('COOLDOWN');
      expect(result.cooldownUntil).toEqual(cooldownDate);
      expect(result.questions).toBeUndefined();
    });

    it('should return AVAILABLE status with sanitized questions stripped of answer keys and explanations', async () => {
      finalExamRepository.findByCourseIdWithQuestions.mockResolvedValue({
        ...mockExam,
        questions: allThreeQuestions,
      });
      examAvailabilityService.checkAvailability.mockResolvedValue({
        status: 'AVAILABLE',
        pendingSessionsCount: 0,
        cooldownUntil: null,
        exam: mockExam,
      });

      const result = await service.getExamByCourse('course-1');

      expect(result.status).toBe('AVAILABLE');
      expect(result.questions).toBeDefined();
      expect(result.questions).toHaveLength(3);

      // Verify MULTIPLE_CHOICE sanitization: no correctOptionId, no isCorrect, no explanation
      const mcSanitized = result.questions!.find(
        (q) => q.type === 'MULTIPLE_CHOICE',
      )!;
      expect((mcSanitized as any).explanation).toBeUndefined();
      expect(mcSanitized.payload.correctOptionId).toBeUndefined();
      for (const opt of mcSanitized.payload.options) {
        expect(opt.isCorrect).toBeUndefined();
      }

      // Verify MATCHING sanitization: no correctPairs, no explanation, rightItems present
      const matSanitized = result.questions!.find(
        (q) => q.type === 'MATCHING',
      )!;
      expect((matSanitized as any).explanation).toBeUndefined();
      expect(matSanitized.payload.correctPairs).toBeUndefined();
      expect(matSanitized.payload.leftItems).toHaveLength(2);
      expect(matSanitized.payload.rightItems).toHaveLength(2);

      // Verify ORDERING sanitization: no correctOrder, no explanation, items present
      const ordSanitized = result.questions!.find(
        (q) => q.type === 'ORDERING',
      )!;
      expect((ordSanitized as any).explanation).toBeUndefined();
      expect(ordSanitized.payload.correctOrder).toBeUndefined();
      expect(ordSanitized.payload.items).toHaveLength(3);
    });

    it('should throw NotFoundException if exam does not exist for course', async () => {
      finalExamRepository.findByCourseIdWithQuestions.mockResolvedValue(null);

      await expect(service.getExamByCourse('course-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('submitAttempt', () => {
    beforeEach(() => {
      finalExamRepository.findById.mockResolvedValue(mockExam);
      finalExamRepository.getQuestionsByExamId.mockResolvedValue(
        allThreeQuestions,
      );
      examAvailabilityService.checkAvailability.mockResolvedValue({
        status: 'AVAILABLE',
        pendingSessionsCount: 0,
        cooldownUntil: null,
        exam: mockExam,
      });
      finalExamRepository.createAttempt.mockImplementation(
        async (att) =>
          ({
            id: 'attempt-1',
            attemptNumber: 1,
            ...att,
            submittedAt: new Date(),
          }) as FinalExamAttempt,
      );
    });

    it('should throw 409 Conflict when submitting during COOLDOWN', async () => {
      examAvailabilityService.checkAvailability.mockResolvedValue({
        status: 'COOLDOWN',
        pendingSessionsCount: 0,
        cooldownUntil: new Date('2026-01-01T11:00:00Z'),
        exam: mockExam,
      });

      await expect(
        service.submitAttempt('exam-1', [
          { questionId: 'q-mc', studentPayload: { selectedOptionId: 'opt2' } },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 409 Conflict when submitting while sessions are pending (LOCKED)', async () => {
      examAvailabilityService.checkAvailability.mockResolvedValue({
        status: 'LOCKED',
        pendingSessionsCount: 1,
        cooldownUntil: null,
        exam: mockExam,
      });

      await expect(
        service.submitAttempt('exam-1', [
          { questionId: 'q-mc', studentPayload: { selectedOptionId: 'opt2' } },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 400 BadRequest when questionId does not belong to exam', async () => {
      await expect(
        service.submitAttempt('exam-1', [
          {
            questionId: 'foreign-q',
            studentPayload: { selectedOptionId: 'opt2' },
          },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw 400 BadRequest when questionId is duplicated', async () => {
      await expect(
        service.submitAttempt('exam-1', [
          { questionId: 'q-mc', studentPayload: { selectedOptionId: 'opt1' } },
          { questionId: 'q-mc', studentPayload: { selectedOptionId: 'opt2' } },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw 400 BadRequest when studentPayload is invalid for question type', async () => {
      // MULTIPLE_CHOICE requires selectedOptionId string
      await expect(
        service.submitAttempt('exam-1', [
          { questionId: 'q-mc', studentPayload: { invalidKey: 123 } },
        ]),
      ).rejects.toThrow(BadRequestException);

      // MATCHING requires pairs record
      await expect(
        service.submitAttempt('exam-1', [
          { questionId: 'q-mat', studentPayload: { pairs: 'not-a-record' } },
        ]),
      ).rejects.toThrow(BadRequestException);

      // ORDERING requires orderedIds array
      await expect(
        service.submitAttempt('exam-1', [
          {
            questionId: 'q-ord',
            studentPayload: { orderedIds: 'not-an-array' },
          },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should correctly evaluate each of the 3 question types as correct and pass', async () => {
      const answers = [
        { questionId: 'q-mc', studentPayload: { selectedOptionId: 'opt2' } },
        {
          questionId: 'q-mat',
          studentPayload: { pairs: { l1: 'r1', l2: 'r2' } },
        },
        {
          questionId: 'q-ord',
          studentPayload: { orderedIds: ['i1', 'i2', 'i3'] },
        },
      ];

      const result = await service.submitAttempt('exam-1', answers);

      expect(result.score).toBe(100);
      expect(result.isPassed).toBe(true);
      expect(result.cooldownUntil).toBeNull();
      expect(result.feedback[0].isCorrect).toBe(true);
      expect(result.feedback[1].isCorrect).toBe(true);
      expect(result.feedback[2].isCorrect).toBe(true);

      // On pass: cooldown cleared and course status set to COMPLETED
      expect(finalExamRepository.updateCooldownUntil).toHaveBeenCalledWith(
        'exam-1',
        null,
      );
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'COMPLETED',
      });
    });

    it('should correctly evaluate each of the 3 question types as incorrect and set cooldown on fail', async () => {
      const answers = [
        { questionId: 'q-mc', studentPayload: { selectedOptionId: 'opt1' } }, // wrong option
        {
          questionId: 'q-mat',
          studentPayload: { pairs: { l1: 'r2', l2: 'r1' } }, // wrong pairs
        },
        {
          questionId: 'q-ord',
          studentPayload: { orderedIds: ['i3', 'i2', 'i1'] }, // wrong order
        },
      ];

      const result = await service.submitAttempt('exam-1', answers);

      expect(result.score).toBe(0);
      expect(result.isPassed).toBe(false);
      expect(result.cooldownUntil).not.toBeNull();
      expect(result.feedback[0].isCorrect).toBe(false);
      expect(result.feedback[1].isCorrect).toBe(false);
      expect(result.feedback[2].isCorrect).toBe(false);

      // On fail: cooldown set and course status NOT completed
      expect(finalExamRepository.updateCooldownUntil).toHaveBeenCalledWith(
        'exam-1',
        expect.any(Date),
      );
      expect(courseRepository.update).not.toHaveBeenCalled();
    });

    it('should count unanswered questions as incorrect with studentPayload null', async () => {
      // Only question 1 answered, questions 2 and 3 omitted
      const answers = [
        { questionId: 'q-mc', studentPayload: { selectedOptionId: 'opt2' } },
      ];

      const result = await service.submitAttempt('exam-1', answers);

      expect(result.score).toBe(33); // 1 of 3 correct
      expect(result.isPassed).toBe(false);
      expect(result.feedback[1].isCorrect).toBe(false);
      expect(result.feedback[1].studentPayload).toBeNull();
      expect(result.feedback[2].isCorrect).toBe(false);
      expect(result.feedback[2].studentPayload).toBeNull();
    });

    it('should pass when score is exactly equal to passingScorePct and fail when 1 percent below', async () => {
      // 10 questions with passingScorePct = 70%
      const tenQuestions: FinalExamQuestion[] = Array.from(
        { length: 10 },
        (_, idx) => ({
          ...mockMcQuestion,
          id: `q-${idx}`,
        }),
      );
      finalExamRepository.getQuestionsByExamId.mockResolvedValue(tenQuestions);

      // Test exactly equal (7 of 10 = 70%)
      const sevenAnswers = Array.from({ length: 10 }, (_, idx) => ({
        questionId: `q-${idx}`,
        studentPayload: { selectedOptionId: idx < 7 ? 'opt2' : 'opt1' },
      }));

      const passResult = await service.submitAttempt('exam-1', sevenAnswers);
      expect(passResult.score).toBe(70);
      expect(passResult.isPassed).toBe(true);

      // Test 1 below (6 of 10 = 60%, below 70%)
      const sixAnswers = Array.from({ length: 10 }, (_, idx) => ({
        questionId: `q-${idx}`,
        studentPayload: { selectedOptionId: idx < 6 ? 'opt2' : 'opt1' },
      }));

      const failResult = await service.submitAttempt('exam-1', sixAnswers);
      expect(failResult.score).toBe(60);
      expect(failResult.isPassed).toBe(false);
    });

    it('should increment attemptNumber on createAttempt', async () => {
      finalExamRepository.createAttempt.mockResolvedValue({
        id: 'att-2',
        attemptNumber: 2,
      } as any);

      const result = await service.submitAttempt('exam-1', []);
      expect(result.attemptNumber).toBe(2);
    });
  });

  describe('listAttempts and getAttempt', () => {
    it('should list attempts for an exam in newest-first order', async () => {
      finalExamRepository.findById.mockResolvedValue(mockExam);
      finalExamRepository.getAttemptsByExamId.mockResolvedValue([
        { id: 'att-2', attemptNumber: 2 } as any,
        { id: 'att-1', attemptNumber: 1 } as any,
      ]);

      const result = await service.listAttempts('exam-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('att-2');
      expect(finalExamRepository.getAttemptsByExamId).toHaveBeenCalledWith(
        'exam-1',
      );
    });

    it('should return stored snapshots from getAttempt without re-evaluating', async () => {
      finalExamRepository.getAttemptById.mockResolvedValue({
        id: 'att-1',
        examId: 'exam-1',
        attemptNumber: 1,
        answers: [
          {
            id: 'ans-1',
            questionId: 'q-mc',
            isCorrect: true,
            questionSnapshot: { prompt: 'Stored Prompt' },
            studentPayload: { selectedOptionId: 'opt2' },
            evalPayload: { evaluated: true },
          } as any,
        ],
      } as any);

      const result = await service.getAttempt('exam-1', 'att-1');

      expect(result.id).toBe('att-1');
      expect(result.answers[0].questionSnapshot.prompt).toBe('Stored Prompt');
      expect(finalExamRepository.getAttemptById).toHaveBeenCalledWith('att-1');
    });

    it('should throw NotFoundException if getAttempt attempt does not belong to exam', async () => {
      finalExamRepository.getAttemptById.mockResolvedValue({
        id: 'att-1',
        examId: 'other-exam',
      } as any);

      await expect(service.getAttempt('exam-1', 'att-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
