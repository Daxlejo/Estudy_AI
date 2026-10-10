import {
  Controller,
  Get,
  Post,
  Param,
  InternalServerErrorException,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { DatabaseError } from '../../database/errors/database-error';

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  private handleError(error: unknown) {
    if (error instanceof DatabaseError) {
      throw new InternalServerErrorException('A database error occurred');
    }
    throw error;
  }

  @Get('courses/:courseId/sessions')
  async listByCourse(@Param('courseId') courseId: string) {
    try {
      return await this.sessionsService.listByCourse(courseId);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('sessions/:id')
  async getById(@Param('id') id: string) {
    try {
      return await this.sessionsService.getById(id);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('sessions/:id/complete')
  async completeSession(@Param('id') id: string) {
    try {
      return await this.sessionsService.completeSession(id);
    } catch (e) {
      this.handleError(e);
    }
  }
}
