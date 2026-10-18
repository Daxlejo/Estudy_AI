import {
  Controller,
  Get,
  Post,
  Param,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { DatabaseError } from '../../database/errors/database-error';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
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
  async listByCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    try {
      return await this.sessionsService.listByCourse(courseId, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('sessions/:id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    try {
      return await this.sessionsService.getById(id, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('sessions/:id/complete')
  async completeSession(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    try {
      return await this.sessionsService.completeSession(id, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }
}
