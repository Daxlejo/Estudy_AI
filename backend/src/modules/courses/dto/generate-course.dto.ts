import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateCourseDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materialIds?: string[];
}
