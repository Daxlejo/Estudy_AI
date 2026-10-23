import { Test, TestingModule } from '@nestjs/testing';
import { GenerationPipelineService } from './generation-pipeline.service';
import { MaterialsService } from '../materials/materials.service';
import { AiService } from '../ai/ai.service';
import {
  aiFinalExamQuestionSchema,
  aiActivitySchema,
} from './dto/ai-course-plan.dto';

describe('Adaptive Activity Selection & Final Exam Types', () => {
  let service: GenerationPipelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationPipelineService,
        { provide: 'CourseRepository', useValue: {} },
        { provide: 'SessionRepository', useValue: {} },
        { provide: 'QuizRepository', useValue: {} },
        { provide: 'FinalExamRepository', useValue: {} },
        { provide: MaterialsService, useValue: {} },
        { provide: AiService, useValue: {} },
      ],
    }).compile();

    service = module.get<GenerationPipelineService>(GenerationPipelineService);
  });

  describe('validateAdaptiveActivityTypes', () => {
    it('should accept session plans with varied activity types', () => {
      const mockSessions = [
        {
          guidedPractice: JSON.stringify({ type: 'matching' }),
          challenge: JSON.stringify({ type: 'multiple_choice' }),
        },
        {
          guidedPractice: JSON.stringify({ type: 'fill_in_blank' }),
          challenge: JSON.stringify({ type: 'true_false' }),
        },
        {
          guidedPractice: JSON.stringify({ type: 'classify' }),
          challenge: JSON.stringify({ type: 'detect_error' }),
        },
      ] as any;

      expect(() =>
        service.validateAdaptiveActivityTypes(mockSessions),
      ).not.toThrow();
    });

    it('should allow up to 2 consecutive identical activity types', () => {
      const mockSessions = [
        {
          guidedPractice: JSON.stringify({ type: 'matching' }),
          challenge: JSON.stringify({ type: 'matching' }),
        },
        {
          guidedPractice: JSON.stringify({ type: 'fill_in_blank' }),
          challenge: JSON.stringify({ type: 'true_false' }),
        },
      ] as any;

      expect(() =>
        service.validateAdaptiveActivityTypes(mockSessions),
      ).not.toThrow();
    });

    it('should reject session plans with > 2 consecutive identical activity types', () => {
      const mockSessions = [
        {
          guidedPractice: JSON.stringify({ type: 'matching' }),
          challenge: JSON.stringify({ type: 'matching' }),
        },
        {
          guidedPractice: JSON.stringify({ type: 'matching' }), // 3 in a row!
          challenge: JSON.stringify({ type: 'true_false' }),
        },
      ] as any;

      expect(() => service.validateAdaptiveActivityTypes(mockSessions)).toThrow(
        /more than 2 consecutive identical activity types detected \("matching"\)/i,
      );
    });

    it('should log warning but not throw when a type appears > 2 times total across plan', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      const mockSessions = [
        {
          guidedPractice: JSON.stringify({ type: 'matching' }),
          challenge: JSON.stringify({ type: 'true_false' }),
        },
        {
          guidedPractice: JSON.stringify({ type: 'fill_in_blank' }),
          challenge: JSON.stringify({ type: 'matching' }),
        },
        {
          guidedPractice: JSON.stringify({ type: 'predict_result' }),
          challenge: JSON.stringify({ type: 'matching' }), // 3rd matching!
        },
      ] as any;

      expect(() =>
        service.validateAdaptiveActivityTypes(mockSessions),
      ).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('matching" appears 3 times in course plan'),
      );
    });

    it('should handle markdown code blocks around JSON activity strings', () => {
      const mockSessions = [
        {
          guidedPractice: '```json\n{"type": "classify"}\n```',
          challenge: '{"type": "detect_error"}',
        },
      ] as any;

      expect(() =>
        service.validateAdaptiveActivityTypes(mockSessions),
      ).not.toThrow();
    });
  });

  describe('aiFinalExamQuestionSchema with MATCHING and ORDERING', () => {
    it('should validate a MULTIPLE_CHOICE exam question', () => {
      const mcQuestion = {
        conceptName: 'Encapsulation',
        type: 'MULTIPLE_CHOICE',
        prompt: 'What is encapsulation?',
        payload: {
          type: 'MULTIPLE_CHOICE',
          options: [
            { id: 'opt-1', text: 'Bundling data and methods', isCorrect: true },
            { id: 'opt-2', text: 'Inheritance hierarchy', isCorrect: false },
          ],
          correctOptionId: 'opt-1',
        },
        explanation: 'Encapsulation bundles state and behavior.',
      };

      const result = aiFinalExamQuestionSchema.safeParse(mcQuestion);
      expect(result.success).toBe(true);
    });

    it('should validate a MATCHING exam question', () => {
      const matchQuestion = {
        conceptName: 'Design Patterns',
        type: 'MATCHING',
        prompt: 'Match each pattern with its classification.',
        payload: {
          type: 'MATCHING',
          leftItems: [
            { id: 'p1', text: 'Singleton' },
            { id: 'p2', text: 'Observer' },
          ],
          rightItems: [
            { id: 'c1', text: 'Creational' },
            { id: 'c2', text: 'Behavioral' },
          ],
          correctPairs: { p1: 'c1', p2: 'c2' },
        },
        explanation: 'Singleton creates, Observer observes.',
      };

      const result = aiFinalExamQuestionSchema.safeParse(matchQuestion);
      expect(result.success).toBe(true);
    });

    it('should validate an ORDERING exam question', () => {
      const orderQuestion = {
        conceptName: 'Algorithm Execution',
        type: 'ORDERING',
        prompt: 'Order the algorithm execution steps.',
        payload: {
          type: 'ORDERING',
          items: [
            { id: 's1', text: 'Initialization' },
            { id: 's2', text: 'Loop execution' },
            { id: 's3', text: 'Termination' },
          ],
          correctOrder: ['s1', 's2', 's3'],
        },
        explanation: 'Correct execution lifecycle.',
      };

      const result = aiFinalExamQuestionSchema.safeParse(orderQuestion);
      expect(result.success).toBe(true);
    });
  });

  describe('aiActivitySchema Zod validation for new Tier 1 & 2 types', () => {
    it('should validate fill_in_blank activity schema', () => {
      const fib = {
        type: 'fill_in_blank',
        sentence: 'La fotosíntesis ocurre en el ___',
        blanks: [{ index: 0, answer: 'cloroplasto' }],
        explanation: 'Los cloroplastos contienen clorofila.',
      };
      expect(aiActivitySchema.safeParse(fib).success).toBe(true);
    });

    it('should validate true_false activity schema', () => {
      const tf = {
        type: 'true_false',
        statement: 'El agua hierve a 100°C a nivel del mar.',
        correct: true,
        justification: 'A 1 atmósfera de presión la ebullición ocurre a 100°C.',
      };
      expect(aiActivitySchema.safeParse(tf).success).toBe(true);
    });

    it('should validate classify activity schema', () => {
      const cls = {
        type: 'classify',
        categories: ['Vertebrado', 'Invertebrado'],
        items: [
          { label: 'Perro', correctCategory: 'Vertebrado' },
          { label: 'Pulpo', correctCategory: 'Invertebrado' },
        ],
        explanation: 'Los vertebrados tienen espina dorsal.',
      };
      expect(aiActivitySchema.safeParse(cls).success).toBe(true);
    });

    it('should validate detect_error activity schema', () => {
      const err = {
        type: 'detect_error',
        codeOrText: 'const x = 5;\nx = 10;',
        errorType: 'sintáctico',
        correctVersion: 'let x = 5;\nx = 10;',
        explanation: 'Variables declaradas con const no pueden reasignarse.',
      };
      expect(aiActivitySchema.safeParse(err).success).toBe(true);
    });

    it('should validate predict_result activity schema', () => {
      const pred = {
        type: 'predict_result',
        scenario: '¿Qué valor tiene result?',
        codeOrText: 'const result = [1, 2, 3].map(x => x * 2);',
        options: [
          { id: 'opt-1', text: '[2, 4, 6]' },
          { id: 'opt-2', text: '[1, 2, 3]' },
        ],
        correctOptionId: 'opt-1',
        explanation: 'map multiplica cada elemento por dos.',
      };
      expect(aiActivitySchema.safeParse(pred).success).toBe(true);
    });
  });
});
