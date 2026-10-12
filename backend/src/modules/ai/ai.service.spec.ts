import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';

// Mock the entire openai module so tests don't make real HTTP calls.
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    _mockCreate: mockCreate,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _mockCreate: mockCreate } = require('openai');

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('should throw if OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;

    const module = await Test.createTestingModule({
      providers: [AiService],
    }).compile();
    const svc = module.get<AiService>(AiService);

    await expect(svc.completeJson('system', 'user')).rejects.toThrow(
      'OPENAI_API_KEY',
    );
  });

  it('should parse and return JSON response from OpenAI', async () => {
    const payload = { concepts: [{ name: 'Test', summary: 'A test concept' }] };
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: { content: JSON.stringify(payload) },
          finish_reason: 'stop',
        },
      ],
    });

    const result = await service.completeJson<typeof payload>(
      'You are a tutor.',
      'Extract concepts from this text.',
    );

    expect(result).toEqual(payload);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: 'json_object' },
        messages: expect.arrayContaining([
          { role: 'system', content: 'You are a tutor.' },
        ]),
      }),
    );
  });

  it('should throw if the response is not valid JSON', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: 'This is not JSON' }, finish_reason: 'stop' },
      ],
    });

    await expect(service.completeJson('s', 'u')).rejects.toThrow(
      'AI returned non-JSON response',
    );
  });

  it('should format 429 rate limit errors safely and cleanly', async () => {
    const error: any = new Error('Rate limit exceeded');
    error.status = 429;
    mockCreate.mockRejectedValue(error);

    await expect(service.completeJson('s', 'u')).rejects.toThrow(
      'AI provider rate limit reached (429)',
    );
  });

  it('should format timeout errors cleanly', async () => {
    const error: any = new Error('Request timed out');
    error.name = 'APIConnectionTimeoutError';
    mockCreate.mockRejectedValue(error);

    await expect(service.completeJson('s', 'u')).rejects.toThrow(
      'AI provider request timed out',
    );
  });

  it('should format 5xx server errors safely', async () => {
    const error: any = new Error('Server overloaded');
    error.status = 503;
    mockCreate.mockRejectedValue(error);

    await expect(service.completeJson('s', 'u')).rejects.toThrow(
      'AI provider service error (503)',
    );
  });

  it('should sanitize API keys from error messages', async () => {
    const error: any = new Error(
      'Invalid token sk-proj-1234567890abcdef1234567890 in header Bearer secret-tok',
    );
    mockCreate.mockRejectedValue(error);

    await expect(service.completeJson('s', 'u')).rejects.toThrow(
      '[REDACTED_KEY]',
    );
  });
});
