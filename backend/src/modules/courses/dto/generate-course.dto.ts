import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateCourseDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materialIds?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['es', 'en'])
  language?: 'es' | 'en';
}
