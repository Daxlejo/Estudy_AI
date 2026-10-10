import { QuizQuestionMapper } from './quiz-question.mapper';
import { FinalExamQuestionMapper } from './final-exam-question.mapper';
import { MapperError } from '../errors/database-error';
import { ExamOption } from '../../domain/models/quiz';

describe('Mappers', () => {
  describe('QuizQuestionMapper', () => {
    it('should serialize valid options', () => {
      const options: ExamOption[] = [
        { id: '1', text: 'Option A' },
        { id: '2', text: 'Option B' },
      ];
      const serialized = QuizQuestionMapper.serializeOptions(options);
      expect(typeof serialized).toBe('string');
      expect(JSON.parse(serialized)).toEqual(options);
    });

    it('should deserialize valid options JSON', () => {
      const json =
        '[{"id":"1","text":"Option A"},{"id":"2","text":"Option B"}]';
      const options = QuizQuestionMapper.deserializeOptions(json);
      expect(options).toHaveLength(2);
      expect(options[0].id).toBe('1');
      expect(options[0].text).toBe('Option A');
    });

    it('should reject invalid JSON syntax', () => {
      const invalidJson = '[{"id":"1"';
      expect(() => QuizQuestionMapper.deserializeOptions(invalidJson)).toThrow(
        MapperError,
      );
    });

    it('should reject structurally invalid schema (missing text)', () => {
      const invalidSchema = '[{"id":"1"}]';
      expect(() =>
        QuizQuestionMapper.deserializeOptions(invalidSchema),
      ).toThrow(MapperError);
    });
  });

  describe('FinalExamQuestionMapper', () => {
    it('should correctly handle discriminator MULTIPLE_CHOICE', () => {
      const payload = { options: [{ id: '1', text: 'Option' }] };
      const serialized = FinalExamQuestionMapper.serializePayload({
        type: 'MULTIPLE_CHOICE',
        ...payload,
      });
      const deserialized = FinalExamQuestionMapper.deserializePayload(
        'MULTIPLE_CHOICE',
        serialized,
      );
      expect(deserialized.type).toBe('MULTIPLE_CHOICE');
      if (deserialized.type === 'MULTIPLE_CHOICE') {
        expect(deserialized.options[0].text).toBe('Option');
      }
    });

    it('should correctly handle discriminator MATCHING', () => {
      const payload = {
        leftItems: [{ id: '1', text: 'L' }],
        rightItems: [{ id: '2', text: 'R' }],
      };
      const serialized = FinalExamQuestionMapper.serializePayload({
        type: 'MATCHING',
        ...payload,
      });
      const deserialized = FinalExamQuestionMapper.deserializePayload(
        'MATCHING',
        serialized,
      );
      expect(deserialized.type).toBe('MATCHING');
      if (deserialized.type === 'MATCHING') {
        expect(deserialized.leftItems[0].text).toBe('L');
      }
    });

    it('should correctly handle discriminator ORDERING', () => {
      const payload = { items: [{ id: '1', text: 'O' }], orderingHint: 'Hint' };
      const serialized = FinalExamQuestionMapper.serializePayload({
        type: 'ORDERING',
        ...payload,
      });
      const deserialized = FinalExamQuestionMapper.deserializePayload(
        'ORDERING',
        serialized,
      );
      expect(deserialized.type).toBe('ORDERING');
      if (deserialized.type === 'ORDERING') {
        expect(deserialized.orderingHint).toBe('Hint');
      }
    });

    it('should reject unknown discriminator', () => {
      const payload = { something: 'else' };
      expect(() =>
        FinalExamQuestionMapper.deserializePayload(
          'UNKNOWN' as any,
          JSON.stringify(payload),
        ),
      ).toThrow(MapperError);
    });
  });
});
