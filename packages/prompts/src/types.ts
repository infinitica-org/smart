import type { z } from 'zod';
import type { AiModelRole } from '@smart/contracts';

/**
 * Prompt template types.
 *
 * A prompt is treated as a versioned artefact, not a string literal, because a
 * grade must remain reproducible. If someone edits a rubric prompt in place,
 * every score awarded before that edit silently becomes unexplainable. So:
 * templates are immutable, edits bump the version, and every audit row stores
 * the `promptRef` that produced it.
 *
 * Owner: Ramansh.
 */

/** Matches `AiCompletionRequestSchema.promptRef`: `bars-l3@2`. */
export type PromptRef = `${string}@${string}`;

export interface RenderedPrompt {
  readonly promptRef: PromptRef;
  readonly system: string;
  readonly user: string;
  readonly modelRole: AiModelRole;
  /** Deterministic grading uses 0. Only conversational prompts raise this. */
  readonly temperature: number;
  readonly maxOutputTokens: number;
  /** Schema the model's JSON output must satisfy before it is trusted. */
  readonly outputSchema: z.ZodType;
}

export interface PromptTemplate<TVariables> {
  readonly id: string;
  readonly version: number;
  /** One line on what this prompt is for; shown in the admin prompt browser. */
  readonly purpose: string;
  readonly modelRole: AiModelRole;
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly outputSchema: z.ZodType;
  /** Input validation, so a malformed variable set fails before spending tokens. */
  readonly variablesSchema: z.ZodType<TVariables>;
  readonly render: (variables: TVariables) => { system: string; user: string };
}

export function promptRef(template: { id: string; version: number }): PromptRef {
  return `${template.id}@${String(template.version)}`;
}
