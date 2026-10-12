import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ExamAnswerDto {
  @IsString()
  questionId: string;

  @IsOptional()
  studentPayload?: any;
}

export class SubmitExamAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers: ExamAnswerDto[];
}
