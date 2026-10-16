export type CourseStatus =
  'CREATED' | 'PROCESSING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';

export interface Course {
  id: string;
  name: string;
  description: string | null;
  status: CourseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  courseId: string;
  name: string;
  storagePath: string;
  type: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export type GenerationJobStatus =
  | 'PENDING'
  | 'EXTRACTING'
  | 'ANALYZING_CONCEPTS'
  | 'ANALYZING_DEPENDENCIES'
  | 'BUILDING_PATH'
  | 'COMPLETED'
  | 'ERROR';

export interface GenerationJob {
  id: string;
  courseId: string;
  status: GenerationJobStatus;
  progress: number;
  currentStepIndex: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
