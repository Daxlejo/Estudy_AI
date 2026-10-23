import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class RecordActivityAttemptDto {
  @IsString()
  @IsNotEmpty()
  activityId: string;

  @IsString()
  @IsNotEmpty()
  activityType: string;

  @IsBoolean()
  correct: boolean;
}
