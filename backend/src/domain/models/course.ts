export interface Course {
  id: string;
  name: string;
  description: string | null;
  status: string;
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

export interface GenerationJob {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  currentStepIndex: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
