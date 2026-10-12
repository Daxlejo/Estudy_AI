import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import OpenAI from 'openai';

export interface AiServiceConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const DEFAULT_AI_MODEL = 'gpt-4o-mini';
export const DEFAULT_MAX_TOKENS = 8192;
export const DEFAULT_TEMPERATURE = 0.3;

/**
 * Thin wrapper around the OpenAI chat-completion API.
 * Sends a system prompt + user message and parses the JSON response.
 * All model/token configuration is driven by environment variables so
 * the service itself contains no magic constants.
 *
 * The OpenAI client is lazily initialized on first use so that the
 * NestJS module can boot even when OPENAI_API_KEY is not yet configured.
 */
@Injectable()
export class AiService implements OnModuleDestroy {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;
  private readonly config: AiServiceConfig;

  constructor() {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: process.env.OPENAI_MODEL ?? DEFAULT_AI_MODEL,
      maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
      temperature:
        Number(process.env.OPENAI_TEMPERATURE) || DEFAULT_TEMPERATURE,
    };
  }

  onModuleDestroy() {
    // OpenAI SDK does not require explicit cleanup; hook kept for future use.
  }

  /** Returns (or lazily creates) the OpenAI client. */
  private getClient(): OpenAI {
    if (!this.config.apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set. ' +
          'Set it in backend/.env to enable AI generation.',
      );
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: this.config.apiKey });
    }
    return this.client;
  }

  /**
   * Sends a JSON-mode chat completion and returns the parsed result.
   * Throws if the API key is not configured or if parsing fails.
   */
  async completeJson<T>(systemPrompt: string, userMessage: string): Promise<T> {
    const client = this.getClient();

    this.logger.debug(
      `Sending chat completion request (model=${this.config.model})`,
    );

    let raw: string;
    try {
      const response = await client.chat.completions.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });

      raw = response.choices[0]?.message?.content ?? '';
    } catch (error: any) {
      if (error?.status === 429) {
        throw new Error(
          'AI provider rate limit reached (429). Please retry in a few moments.',
        );
      }
      if (
        error?.name === 'APIConnectionTimeoutError' ||
        error?.code === 'ETIMEDOUT'
      ) {
        throw new Error(
          'AI provider request timed out. Please retry in a few moments.',
        );
      }
      if (typeof error?.status === 'number' && error.status >= 500) {
        throw new Error(
          `AI provider service error (${error.status}). Please retry in a few moments.`,
        );
      }
      const rawMsg = error instanceof Error ? error.message : String(error);
      const sanitized = rawMsg
        .replace(/sk-[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_KEY]')
        .replace(/Bearer\s+[a-zA-Z0-9_\.\-]+/gi, 'Bearer [REDACTED]');
      throw new Error(`AI completion failed: ${sanitized}`);
    }

    this.logger.debug(`Received response (${raw.length} chars)`);

    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(`AI returned non-JSON response: ${raw.slice(0, 200)}...`);
    }
  }
}
