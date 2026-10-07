import { MapperError } from '../errors/database-error';

export class QuizAttemptAnswerMapper {
  static serializeSnapshot(snapshot: any): string {
    return JSON.stringify(snapshot);
  }

  static deserializeSnapshot(payloadStr: string): any {
    try {
      return JSON.parse(payloadStr);
    } catch (error) {
      throw new MapperError('QuizAttemptAnswerMapper', payloadStr, error);
    }
  }
}
