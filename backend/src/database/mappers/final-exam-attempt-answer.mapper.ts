import { MapperError } from '../errors/database-error';

export class FinalExamAttemptAnswerMapper {
  static serializePayload(payload: any): string | null {
    if (payload === null || payload === undefined) return null;
    return JSON.stringify(payload);
  }

  static deserializePayload(payloadStr: string | null): any | null {
    if (!payloadStr) return null;
    try {
      return JSON.parse(payloadStr);
    } catch (error) {
      throw new MapperError('FinalExamAttemptAnswerMapper', payloadStr, error);
    }
  }

  static serializeEvalPayload(payload: any): string {
    return JSON.stringify(payload);
  }

  static deserializeEvalPayload(payloadStr: string): any {
    try {
      return JSON.parse(payloadStr);
    } catch (error) {
      throw new MapperError('FinalExamAttemptAnswerMapper', payloadStr, error);
    }
  }

  static serializeSnapshot(snapshot: any): string {
    return JSON.stringify(snapshot);
  }

  static deserializeSnapshot(snapshotStr: string): any {
    try {
      return JSON.parse(snapshotStr);
    } catch (error) {
      throw new MapperError(
        'FinalExamAttemptAnswerMapper.Snapshot',
        snapshotStr,
        error,
      );
    }
  }
}
