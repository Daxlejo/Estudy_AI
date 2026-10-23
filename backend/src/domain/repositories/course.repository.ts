import { Course, Material, GenerationJob } from '../models/course';

export interface CourseRepository {
  findById(id: string): Promise<Course | null>;
  findAll(): Promise<Course[]>;
  findByUserId(userId: string): Promise<Course[]>;
  claimLegacyCourses(userId: string): Promise<number>;
  create(data: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course>;
  update(
    id: string,
    data: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Course>;
  delete(id: string): Promise<void>;

  addMaterial(material: Omit<Material, 'id' | 'uploadedAt'>): Promise<Material>;
  getMaterialsByCourseId(courseId: string): Promise<Material[]>;
  countByCourseId(courseId: string): Promise<number>;

  createGenerationJob(
    job: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<GenerationJob>;
  updateGenerationJob(
    id: string,
    data: Partial<Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<GenerationJob>;
  getGenerationJobsByCourseId(courseId: string): Promise<GenerationJob[]>;
  findGenerationJobById(id: string): Promise<GenerationJob | null>;
  getLatestGenerationJob(courseId: string): Promise<GenerationJob | null>;
}
