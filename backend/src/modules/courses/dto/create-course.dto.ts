import { IsString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
import { COURSE_BANNER_KEYS } from '../../../domain/models/course';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(COURSE_BANNER_KEYS)
  bannerKey?: string;
}
