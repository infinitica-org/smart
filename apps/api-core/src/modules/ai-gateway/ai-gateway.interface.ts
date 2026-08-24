import type { z } from 'zod';
import type { AiModelRole, AiProvider } from '@smart/contracts';

export interface ProviderHealthResult {
  readonly provider: AiProvider;
  readonly reachable: boolean;
  readonly circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  readonly latencyMs: number | null;
  readonly message?: string;
}

export interface ModelCompletionOptions {
  readonly system?: string;
  readonly prompt: string;
  readonly modelRole: AiModelRole;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly outputSchema?: z.ZodType;
}

export interface ModelCompletionResult {
  readonly output: unknown;
  readonly rawText: string;
  readonly provider: AiProvider;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly latencyMs: number;
}

export interface AiProviderAdapter {
  readonly provider: AiProvider;
  readonly isConfigured: boolean;
  checkHealth(): Promise<ProviderHealthResult>;
  complete(options: ModelCompletionOptions): Promise<ModelCompletionResult>;
}
