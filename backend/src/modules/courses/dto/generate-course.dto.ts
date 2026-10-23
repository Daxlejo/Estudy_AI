import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class GenerateCourseDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'A course cannot have more than 5 materials' })
  @IsString({ each: true })
  materialIds?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['es', 'en'])
  language?: 'es' | 'en';
}
