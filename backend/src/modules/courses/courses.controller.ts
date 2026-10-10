import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  InternalServerErrorException,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { DatabaseError } from '../../database/errors/database-error';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  private handleError(error: unknown) {
    if (error instanceof DatabaseError) {
      throw new InternalServerErrorException('A database error occurred');
    }
    throw error;
  }

  @Get()
  async list() {
    try {
      return await this.coursesService.list();
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      return await this.coursesService.getById(id);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get(':id/progress')
  async getProgress(@Param('id') id: string) {
    try {
      return await this.coursesService.getCourseProgress(id);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post()
  async create(@Body() createCourseDto: CreateCourseDto) {
    try {
      return await this.coursesService.create(createCourseDto);
    } catch (e) {
      this.handleError(e);
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      return await this.coursesService.delete(id);
    } catch (e) {
      this.handleError(e);
    }
  }
}
