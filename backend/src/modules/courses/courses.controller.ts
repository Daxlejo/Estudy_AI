import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { CoursesService, CourseProgressResult } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { GenerateCourseDto } from './dto/generate-course.dto';
import {
  GenerationStatusResponseDto,
  GenerationJobResponseDto,
} from './dto/generation-status-response.dto';
import { DatabaseError } from '../../database/errors/database-error';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  private handleError(error: unknown): never {
    if (error instanceof DatabaseError) {
      throw new InternalServerErrorException('A database error occurred');
    }
    throw error;
  }

  @Get()
  async list(@CurrentUser() user?: CurrentUserPayload) {
    try {
      return user?.sub
        ? await this.coursesService.list(user.sub)
        : await this.coursesService.list();
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    try {
      return user?.sub
        ? await this.coursesService.getById(id, user.sub)
        : await this.coursesService.getById(id);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get(':id/progress')
  async getProgress(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<CourseProgressResult> {
    try {
      return user?.sub
        ? await this.coursesService.getCourseProgress(id, user.sub)
        : await this.coursesService.getCourseProgress(id);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get(':id/generation-status')
  async getGenerationStatus(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<GenerationStatusResponseDto> {
    try {
      return user?.sub
        ? await this.coursesService.getGenerationStatus(id, user.sub)
        : await this.coursesService.getGenerationStatus(id);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post()
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    try {
      return user?.sub
        ? await this.coursesService.create(createCourseDto, user.sub)
        : await this.coursesService.create(createCourseDto);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post(':id/generate')
  async generate(
    @Param('id') id: string,
    @Body() generateCourseDto?: GenerateCourseDto,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<GenerationJobResponseDto> {
    try {
      return user?.sub
        ? await this.coursesService.startGeneration(
            id,
            user.sub,
            generateCourseDto,
          )
        : await this.coursesService.startGeneration(id, generateCourseDto);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    try {
      return user?.sub
        ? await this.coursesService.update(id, updateCourseDto, user.sub)
        : await this.coursesService.update(id, updateCourseDto);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    try {
      return user?.sub
        ? await this.coursesService.delete(id, user.sub)
        : await this.coursesService.delete(id);
    } catch (e) {
      this.handleError(e);
    }
  }
}
