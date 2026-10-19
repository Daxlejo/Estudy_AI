export type CourseStatus =
  'CREATED' | 'PROCESSING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';

export const COURSE_BANNER_KEYS = [
  'deep-space',
  'forest-notebook',
  'sunset-study',
  'ocean-focus',
  'minimal-paper',
  'neon-lab',
  'golden-hour',
  'rainy-window',
  'cherry-blossom',
  'midnight-ink',
] as const;

export type CourseBannerKey = (typeof COURSE_BANNER_KEYS)[number];

export function getRandomCourseBannerKey(): CourseBannerKey {
  const index = Math.floor(Math.random() * COURSE_BANNER_KEYS.length);
  return COURSE_BANNER_KEYS[index];
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  bannerKey?: string | null;
  status: CourseStatus;
  userId?: string | null;
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
