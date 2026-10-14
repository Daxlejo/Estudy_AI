import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { PrismaCourseRepository } from './prisma-course.repository';

describe('PrismaCourseRepository', () => {
  let repository: PrismaCourseRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaCourseRepository],
    }).compile();

    repository = module.get<PrismaCourseRepository>(PrismaCourseRepository);
    prisma = module.get<PrismaService>(PrismaService);

    // Ensure connection is open
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up test data without violating foreign key constraints on existing DB courses
    await prisma.generationJob.deleteMany({
      where: { course: { name: { in: ['Test Course', 'Gen Course'] } } },
    });
    await prisma.course.deleteMany({
      where: { name: { in: ['Test Course', 'Gen Course'] } },
    });
  });

  it('should create and retrieve a course', async () => {
    const courseData = {
      name: 'Test Course',
      description: 'A test course',
      status: 'CREATED' as const,
    };

    const created = await repository.create(courseData);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Test Course');

    const retrieved = await repository.findById(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.name).toBe('Test Course');
  });

  it('should return null for non-existent course', async () => {
    const retrieved = await repository.findById('non-existent-id');
    expect(retrieved).toBeNull();
  });

  it('should create and retrieve a generation job by id', async () => {
    const course = await repository.create({
      name: 'Gen Course',
      description: null,
      status: 'CREATED',
    });

    const job = await repository.createGenerationJob({
      courseId: course.id,
      status: 'PENDING',
      progress: 0,
      currentStepIndex: 0,
      errorMessage: null,
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe('PENDING');

    const found = await repository.findGenerationJobById(job.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(job.id);
    expect(found!.courseId).toBe(course.id);
    expect(found!.progress).toBe(0);
  });

  it('should return null when generation job does not exist', async () => {
    const found = await repository.findGenerationJobById('non-existent-job');
    expect(found).toBeNull();

    const latest = await repository.getLatestGenerationJob(
      'non-existent-course',
    );
    expect(latest).toBeNull();
  });

  it('should deterministically retrieve the latest generation job when multiple exist', async () => {
    const course = await repository.create({
      name: 'Multi Job Course',
      description: null,
      status: 'CREATED',
    });

    const firstJob = await repository.createGenerationJob({
      courseId: course.id,
      status: 'ERROR',
      progress: 30,
      currentStepIndex: 1,
      errorMessage: 'First attempt failed',
    });

    // Small delay to ensure timestamp difference or rely on sequential creation order
    await new Promise((resolve) => setTimeout(resolve, 15));

    const secondJob = await repository.createGenerationJob({
      courseId: course.id,
      status: 'EXTRACTING',
      progress: 20,
      currentStepIndex: 0,
      errorMessage: null,
    });

    const latest = await repository.getLatestGenerationJob(course.id);
    expect(latest).not.toBeNull();
    expect(latest!.id).toBe(secondJob.id);
    expect(latest!.status).toBe('EXTRACTING');
    expect(latest!.progress).toBe(20);
    expect(latest!.id).not.toBe(firstJob.id);
  });
});
