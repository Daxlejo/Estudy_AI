import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  QuizzesService,
  GetQuizResponse,
  SubmitQuizAttemptResult,
} from './quizzes.service';
import { QuizAttempt } from '../../domain/models/quiz';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { DatabaseError } from '../../database/errors/database-error';

@Controller()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  private handleError(error: unknown): never {
    if (error instanceof DatabaseError) {
      throw new InternalServerErrorException('A database error occurred');
    }
    throw error;
  }

  @Get('sessions/:sessionId/quiz')
  async getQuizBySession(
    @Param('sessionId') sessionId: string,
  ): Promise<GetQuizResponse> {
    try {
      return await this.quizzesService.getQuizBySession(sessionId);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('quizzes/:quizId')
  async getQuizById(
    @Param('quizId') quizId: string,
  ): Promise<GetQuizResponse> {
    try {
      return await this.quizzesService.getQuizById(quizId);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('quizzes/:quizId/attempts')
  async submitAttempt(
    @Param('quizId') quizId: string,
    @Body() dto: SubmitAttemptDto,
  ): Promise<SubmitQuizAttemptResult> {
    try {
      return await this.quizzesService.submitAttempt(quizId, dto.answers);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('quizzes/:quizId/attempts')
  async listAttempts(@Param('quizId') quizId: string): Promise<QuizAttempt[]> {
    try {
      return await this.quizzesService.listAttempts(quizId);
    } catch (e) {
      this.handleError(e);
    }
  }
}
