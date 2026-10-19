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
  QuizzesService,
  GetQuizResponse,
  SubmitQuizAttemptResult,
} from './quizzes.service';
import { QuizAttempt } from '../../domain/models/quiz';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { DatabaseError } from '../../database/errors/database-error';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
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
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<GetQuizResponse> {
    try {
      return await this.quizzesService.getQuizBySession(sessionId, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('quizzes/:quizId')
  async getQuizById(
    @Param('quizId') quizId: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<GetQuizResponse> {
    try {
      return await this.quizzesService.getQuizById(quizId, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('quizzes/:quizId/attempts')
  async submitAttempt(
    @Param('quizId') quizId: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<SubmitQuizAttemptResult> {
    try {
      return await this.quizzesService.submitAttempt(
        quizId,
        dto.answers,
        user?.sub,
      );
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('quizzes/:quizId/attempts')
  async listAttempts(
    @Param('quizId') quizId: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<QuizAttempt[]> {
    try {
      return await this.quizzesService.listAttempts(quizId, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }
}
