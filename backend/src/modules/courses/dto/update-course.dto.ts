import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { COURSE_BANNER_KEYS } from '../../../domain/models/course';

export const COURSE_NAME_MAX_LENGTH = 120;
export const COURSE_DESCRIPTION_MAX_LENGTH = 1000;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Metadata that a user may edit. Only fields that are present are updated.
// - `name`: optional, but when sent it must be a non-blank string (null is rejected).
// - `description`: optional; `null` or a blank string clears it.
// - `bannerKey`: optional; must be one of the 10 valid banner keys when provided.
export class UpdateCourseDto {
  @ValidateIf((_obj, value) => value !== undefined)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(COURSE_NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(COURSE_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsIn(COURSE_BANNER_KEYS)
  bannerKey?: string | null;
}
