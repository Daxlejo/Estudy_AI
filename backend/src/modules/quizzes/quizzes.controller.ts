import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  InternalServerErrorException,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { DatabaseError } from '../../database/errors/database-error';

@Controller()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  private handleError(error: unknown) {
    if (error instanceof DatabaseError) {
      throw new InternalServerErrorException('A database error occurred');
    }
    throw error;
  }

  @Get('sessions/:sessionId/quiz')
  async getQuizBySession(@Param('sessionId') sessionId: string) {
    try {
      return await this.quizzesService.getQuizBySession(sessionId);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('quizzes/:quizId/attempts')
  async submitAttempt(
    @Param('quizId') quizId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    try {
      return await this.quizzesService.submitAttempt(quizId, dto.answers);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('quizzes/:quizId/attempts')
  async listAttempts(@Param('quizId') quizId: string) {
    try {
      return await this.quizzesService.listAttempts(quizId);
    } catch (e) {
      this.handleError(e);
    }
  }
}
