import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { Quiz, QuizQuestion } from '../../domain/models/quiz';
import { Session } from '../../domain/models/session';

describe('QuizzesService', () => {
  let service: QuizzesService;
  let quizRepository: jest.Mocked<QuizRepository>;
  let sessionRepository: jest.Mocked<SessionRepository>;

  const mockSession: Session = {
    id: 'session-1',
    courseId: 'course-1',
    sequenceOrder: 1,
    title: 'Session 1',
    learningObjective: 'Objective 1',
    durationMinutes: 15,
    xpReward: 100,
    isUnlocked: true,
    introTitle: 'Intro',
    introContent: 'Content',
    introKeyTakeaway: 'Key takeaway',
    introCodeSnippet: null,
    guidedPractice: 'Practice',
    challenge: 'Challenge',
    createdAt: new Date(),
  };

  const mockQuiz: Quiz = {
    id: 'quiz-1',
    sessionId: 'session-1',
    passingThreshold: 70,
    xpReward: 50,
    createdAt: new Date(),
  };

  const mockQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      quizId: 'quiz-1',
      conceptId: 'c1',
      prompt: 'Question 1',
      context: null,
      options: [
        { id: 'opt1', text: 'Option 1', isCorrect: true },
        { id: 'opt2', text: 'Option 2', isCorrect: false },
      ],
      explanation: 'Explanation for question 1',
      createdAt: new Date(),
    },
    {
      id: 'q2',
      quizId: 'quiz-1',
      conceptId: 'c2',
      prompt: 'Question 2',
      context: null,
      options: [
        { id: 'opt3', text: 'Option 3', isCorrect: false },
        { id: 'opt4', text: 'Option 4', isCorrect: true },
      ],
      explanation: 'Explanation for question 2',
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    quizRepository = {
      findById: jest.fn(),
      findBySessionId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addQuestion: jest.fn(),
      getQuestionsByQuizId: jest.fn(),
      createAttempt: jest.fn(),
      getAttemptsByCourseId: jest.fn(),
      getAttemptsByQuizId: jest.fn(),
    } as any;

    sessionRepository = {
      findById: jest.fn(),
      findByCourseId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addConcept: jest.fn(),
      getConceptsBySessionId: jest.fn(),
      unlockNextSession: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: 'QuizRepository', useValue: quizRepository },
        { provide: 'SessionRepository', useValue: sessionRepository },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
  });

  describe('getQuizBySession', () => {
    it('should return quiz questions without leaking isCorrect and without explanation anywhere', async () => {
      quizRepository.findBySessionId.mockResolvedValue(mockQuiz);
      quizRepository.getQuestionsByQuizId.mockResolvedValue(mockQuestions);

      const result = await service.getQuizBySession('session-1');

      expect(result.id).toBe('quiz-1');
      expect(result.questions).toHaveLength(2);

      // Verify no explanation on any question
      for (const q of result.questions) {
        expect(q.explanation).toBeUndefined();
        // Verify no isCorrect on any option
        for (const opt of q.options) {
          expect(opt.isCorrect).toBeUndefined();
        }
      }

      // Verify options retain id and text
      expect(result.questions[0].options[0]).toEqual({
        id: 'opt1',
        text: 'Option 1',
      });
      expect(result.questions[0].options[1]).toEqual({
        id: 'opt2',
        text: 'Option 2',
      });
    });

    it('should throw NotFoundException if quiz does not exist for session', async () => {
      quizRepository.findBySessionId.mockResolvedValue(null);

      await expect(service.getQuizBySession('session-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('submitAttempt', () => {
    beforeEach(() => {
      quizRepository.findById.mockResolvedValue(mockQuiz);
      quizRepository.getQuestionsByQuizId.mockResolvedValue(mockQuestions);
      sessionRepository.findById.mockResolvedValue(mockSession);
      quizRepository.getAttemptsByCourseId.mockResolvedValue([]);
      quizRepository.createAttempt.mockResolvedValue({} as any);
      sessionRepository.unlockNextSession.mockResolvedValue({
        id: 'session-2',
      } as any);
    });

    it('should pass and unlock next session when all answers are correct', async () => {
      const answers = [
        { questionId: 'q1', selectedOptionId: 'opt1' },
        { questionId: 'q2', selectedOptionId: 'opt4' },
      ];

      const result = await service.submitAttempt('quiz-1', answers);

      expect(result.score).toBe(100);
      expect(result.isPassed).toBe(true);
      expect(result.attemptNumber).toBe(1);
      expect(sessionRepository.unlockNextSession).toHaveBeenCalledWith(
        'session-1',
      );
      expect(result.nextSession).toEqual({ id: 'session-2' });
      expect(quizRepository.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-1',
          quizId: 'quiz-1',
          attemptNumber: 1,
          totalQuestions: 2,
          correctAnswers: 2,
          incorrectAnswers: 0,
          scorePercent: 100,
          isPassed: true,
        }),
        expect.any(Array),
      );
    });

    it('should fail and NOT unlock next session when score is below passingThreshold', async () => {
      // 1 of 2 correct = 50%, passingThreshold is 70%
      const answers = [
        { questionId: 'q1', selectedOptionId: 'opt1' }, // correct
        { questionId: 'q2', selectedOptionId: 'opt3' }, // incorrect
      ];

      const result = await service.submitAttempt('quiz-1', answers);

      expect(result.score).toBe(50);
      expect(result.isPassed).toBe(false);
      expect(result.nextSession).toBeNull();
      expect(sessionRepository.unlockNextSession).not.toHaveBeenCalled();
      expect(quizRepository.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          correctAnswers: 1,
          incorrectAnswers: 1,
          scorePercent: 50,
          isPassed: false,
        }),
        expect.any(Array),
      );
    });

    it('should count unanswered question or null selectedOptionId as incorrect', async () => {
      // q1 has null selectedOptionId, q2 is missing from answers array entirely
      const answers = [{ questionId: 'q1', selectedOptionId: null }];

      const result = await service.submitAttempt('quiz-1', answers);

      expect(result.score).toBe(0);
      expect(result.isPassed).toBe(false);
      expect(result.feedback[0].isCorrect).toBe(false);
      expect(result.feedback[0].selectedOptionId).toBeNull();
      expect(result.feedback[0].selectedOptionText).toBeNull();
      expect(result.feedback[1].isCorrect).toBe(false);
      expect(result.feedback[1].selectedOptionId).toBeNull();
      expect(sessionRepository.unlockNextSession).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when questionId does not belong to the quiz', async () => {
      const answers = [
        { questionId: 'q1', selectedOptionId: 'opt1' },
        { questionId: 'unknown-question-id', selectedOptionId: 'opt1' },
      ];

      await expect(service.submitAttempt('quiz-1', answers)).rejects.toThrow(
        BadRequestException,
      );
      expect(quizRepository.createAttempt).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when questionId is duplicated', async () => {
      const answers = [
        { questionId: 'q1', selectedOptionId: 'opt1' },
        { questionId: 'q1', selectedOptionId: 'opt2' },
      ];

      await expect(service.submitAttempt('quiz-1', answers)).rejects.toThrow(
        BadRequestException,
      );
      expect(quizRepository.createAttempt).not.toHaveBeenCalled();
    });

    it('should increment attemptNumber across attempts for the same quiz', async () => {
      quizRepository.getAttemptsByCourseId.mockResolvedValue([
        { id: 'att1', quizId: 'quiz-1', attemptNumber: 1 } as any,
        { id: 'att2', quizId: 'quiz-1', attemptNumber: 2 } as any,
        { id: 'att3', quizId: 'other-quiz', attemptNumber: 1 } as any,
      ]);

      const answers = [
        { questionId: 'q1', selectedOptionId: 'opt1' },
        { questionId: 'q2', selectedOptionId: 'opt4' },
      ];

      const result = await service.submitAttempt('quiz-1', answers);

      expect(result.attemptNumber).toBe(3);
      expect(quizRepository.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptNumber: 3,
        }),
        expect.any(Array),
      );
    });

    it('should throw InternalServerErrorException (500) if a question has 0 correct options', async () => {
      const brokenQuestions: QuizQuestion[] = [
        {
          id: 'q-broken-zero',
          quizId: 'quiz-1',
          conceptId: 'c1',
          prompt: 'No correct option',
          context: null,
          options: [
            { id: 'opt1', text: 'Opt 1', isCorrect: false },
            { id: 'opt2', text: 'Opt 2', isCorrect: false },
          ],
          explanation: 'Expl',
          createdAt: new Date(),
        },
      ];
      quizRepository.getQuestionsByQuizId.mockResolvedValue(brokenQuestions);

      await expect(
        service.submitAttempt('quiz-1', [
          { questionId: 'q-broken-zero', selectedOptionId: 'opt1' },
        ]),
      ).rejects.toThrow(InternalServerErrorException);
      expect(quizRepository.createAttempt).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException (500) if a question has multiple correct options', async () => {
      const brokenQuestions: QuizQuestion[] = [
        {
          id: 'q-broken-multi',
          quizId: 'quiz-1',
          conceptId: 'c1',
          prompt: 'Multiple correct options',
          context: null,
          options: [
            { id: 'opt1', text: 'Opt 1', isCorrect: true },
            { id: 'opt2', text: 'Opt 2', isCorrect: true },
          ],
          explanation: 'Expl',
          createdAt: new Date(),
        },
      ];
      quizRepository.getQuestionsByQuizId.mockResolvedValue(brokenQuestions);

      await expect(
        service.submitAttempt('quiz-1', [
          { questionId: 'q-broken-multi', selectedOptionId: 'opt1' },
        ]),
      ).rejects.toThrow(InternalServerErrorException);
      expect(quizRepository.createAttempt).not.toHaveBeenCalled();
    });
  });

  describe('listAttempts', () => {
    it('should list attempts for an existing quiz', async () => {
      quizRepository.findById.mockResolvedValue(mockQuiz);
      quizRepository.getAttemptsByQuizId.mockResolvedValue([
        { id: 'att-1', attemptNumber: 1 } as any,
      ]);

      const result = await service.listAttempts('quiz-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('att-1');
      expect(quizRepository.getAttemptsByQuizId).toHaveBeenCalledWith('quiz-1');
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      quizRepository.findById.mockResolvedValue(null);

      await expect(service.listAttempts('quiz-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
