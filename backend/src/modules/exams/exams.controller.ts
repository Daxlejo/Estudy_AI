import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ExamsService,
  SanitizedExamResponse,
  SubmitExamAttemptResult,
} from './exams.service';
import { SubmitExamAttemptDto } from './dto/submit-exam-attempt.dto';
import {
  FinalExamAttempt,
  FinalExamAttemptAnswer,
} from '../../domain/models/final-exam';
import { DatabaseError } from '../../database/errors/database-error';

@Controller()
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  private handleError(error: unknown): never {
    if (error instanceof DatabaseError) {
      throw new InternalServerErrorException('A database error occurred');
    }
    throw error;
  }

  @Get('courses/:courseId/exam')
  async getExamByCourse(
    @Param('courseId') courseId: string,
  ): Promise<SanitizedExamResponse> {
    try {
      return await this.examsService.getExamByCourse(courseId);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('exams/:examId/attempts')
  async submitAttempt(
    @Param('examId') examId: string,
    @Body() dto: SubmitExamAttemptDto,
  ): Promise<SubmitExamAttemptResult> {
    try {
      return await this.examsService.submitAttempt(examId, dto.answers);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('exams/:examId/attempts')
  async listAttempts(
    @Param('examId') examId: string,
  ): Promise<FinalExamAttempt[]> {
    try {
      return await this.examsService.listAttempts(examId);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('exams/:examId/attempts/:attemptId')
  async getAttempt(
    @Param('examId') examId: string,
    @Param('attemptId') attemptId: string,
  ): Promise<FinalExamAttempt & { answers: FinalExamAttemptAnswer[] }> {
    try {
      return await this.examsService.getAttempt(examId, attemptId);
    } catch (e) {
      this.handleError(e);
    }
  }
}
