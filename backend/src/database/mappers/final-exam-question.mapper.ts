import { z } from 'zod';
import { FinalExamQuestionPayload } from '../../domain/models/final-exam';
import { MapperError } from '../errors/database-error';

const multipleChoicePayloadSchema = z.object({
  options: z.array(z.object({ id: z.string(), text: z.string() })),
});

const matchingPayloadSchema = z.object({
  leftItems: z.array(z.object({ id: z.string(), text: z.string() })),
  rightItems: z.array(z.object({ id: z.string(), text: z.string() })),
});

const orderingPayloadSchema = z.object({
  items: z.array(z.object({ id: z.string(), text: z.string() })),
  orderingHint: z.string().optional(),
});

export class FinalExamQuestionMapper {
  static serializePayload(payload: FinalExamQuestionPayload): string {
    return JSON.stringify(payload);
  }

  static deserializePayload(
    type: string,
    payloadStr: string,
  ): FinalExamQuestionPayload {
    try {
      const parsed = JSON.parse(payloadStr);

      switch (type) {
        case 'MULTIPLE_CHOICE': {
          const validated = multipleChoicePayloadSchema.parse(parsed);
          return { type: 'MULTIPLE_CHOICE', ...validated };
        }
        case 'MATCHING': {
          const validated = matchingPayloadSchema.parse(parsed);
          return { type: 'MATCHING', ...validated };
        }
        case 'ORDERING': {
          const validated = orderingPayloadSchema.parse(parsed);
          return { type: 'ORDERING', ...validated };
        }
        default:
          throw new Error(`Unknown FinalExamQuestionType: ${type}`);
      }
    } catch (error) {
      throw new MapperError(
        'FinalExamQuestionMapper',
        { type, payloadStr },
        error,
      );
    }
  }
}
