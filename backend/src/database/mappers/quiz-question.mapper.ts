import { z } from 'zod';
import { ExamOption } from '../../domain/models/quiz';
import { MapperError } from '../errors/database-error';

export const examOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const quizOptionsPayloadSchema = z.array(examOptionSchema);

export class QuizQuestionMapper {
  static serializeOptions(options: ExamOption[]): string {
    return JSON.stringify(options);
  }

  static deserializeOptions(payloadStr: string): ExamOption[] {
    try {
      const parsed = JSON.parse(payloadStr);
      const validated = quizOptionsPayloadSchema.parse(parsed);
      return validated;
    } catch (error) {
      throw new MapperError('QuizQuestionMapper', payloadStr, error);
    }
  }
}
