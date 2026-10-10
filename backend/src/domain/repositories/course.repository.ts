import { Course, Material, GenerationJob } from '../models/course';

export interface CourseRepository {
  findById(id: string): Promise<Course | null>;
  findAll(): Promise<Course[]>;
  create(data: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course>;
  update(
    id: string,
    data: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Course>;
  delete(id: string): Promise<void>;

  addMaterial(material: Omit<Material, 'id' | 'uploadedAt'>): Promise<Material>;
  getMaterialsByCourseId(courseId: string): Promise<Material[]>;

  createGenerationJob(
    job: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<GenerationJob>;
  updateGenerationJob(
    id: string,
    data: Partial<Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<GenerationJob>;
  getGenerationJobsByCourseId(courseId: string): Promise<GenerationJob[]>;
}
