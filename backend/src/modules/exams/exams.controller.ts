import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  InternalServerErrorException,
  UseGuards,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
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
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<SanitizedExamResponse> {
    try {
      return await this.examsService.getExamByCourse(
        courseId,
        undefined,
        user?.sub,
      );
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('exams/:examId/attempts')
  async submitAttempt(
    @Param('examId') examId: string,
    @Body() dto: SubmitExamAttemptDto,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<SubmitExamAttemptResult> {
    try {
      return await this.examsService.submitAttempt(
        examId,
        dto.answers,
        undefined,
        user?.sub,
      );
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('exams/:examId/attempts')
  async listAttempts(
    @Param('examId') examId: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<FinalExamAttempt[]> {
    try {
      return await this.examsService.listAttempts(examId, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('exams/:examId/attempts/:attemptId')
  async getAttempt(
    @Param('examId') examId: string,
    @Param('attemptId') attemptId: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<FinalExamAttempt & { answers: FinalExamAttemptAnswer[] }> {
    try {
      return await this.examsService.getAttempt(examId, attemptId, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }
}
