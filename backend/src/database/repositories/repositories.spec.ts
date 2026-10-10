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
    // Clean up to prevent isolated test state leakage
    await prisma.course.deleteMany({});
  });

  it('should create and retrieve a course', async () => {
    const courseData = {
      name: 'Test Course',
      description: 'A test course',
      status: 'DRAFT',
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
});
