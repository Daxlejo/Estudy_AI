export type ProcessingStepKey =
  'EXTRACTION' | 'CONCEPTS' | 'DEPENDENCIES' | 'GROUPING' | 'LEARNING_PATH';

export type ProcessingStepStatus =
  'pending' | 'in_progress' | 'completed' | 'error';

export interface GenerationStepDto {
  key: ProcessingStepKey;
  label: string;
  description?: string;
  status: ProcessingStepStatus;
}

export interface GenerationMetricsDto {
  sessionsCount: number;
  conceptsCount: number;
  levelsCount: number;
}

export interface GenerationStatusResponseDto {
  jobId: string;
  courseId: string;
  courseName: string;
  bannerKey?: string | null;
  status:
    | 'PENDING'
    | 'EXTRACTING'
    | 'ANALYZING_CONCEPTS'
    | 'ANALYZING_DEPENDENCIES'
    | 'BUILDING_PATH'
    | 'COMPLETED'
    | 'ERROR';
  progressPercent: number;
  currentStepIndex: number;
  steps: GenerationStepDto[];
  metrics?: GenerationMetricsDto;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationJobResponseDto {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  currentStepIndex: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
