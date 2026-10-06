import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService Connection', () => {
  let service: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    await service.onModuleInit();
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  it('should successfully connect to SQLite and query', async () => {
    // A simple query to prove Prisma is talking to SQLite without relying on business models
    const result: any[] = await service.$queryRaw`SELECT 1 as result`;
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    // SQLite can sometimes return BigInt or numbers based on query, so we just verify it executed cleanly.
    expect(Number(result[0].result)).toBe(1);
  });
});
