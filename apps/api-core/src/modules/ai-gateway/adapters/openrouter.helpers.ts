import type { AiModelRole } from '@smart/contracts';

export const OPENROUTER_ROLE_TO_MODEL: Record<AiModelRole, string> = {
  PRIMARY_REASONING: 'anthropic/claude-3.5-sonnet',
  FAST_EXTRACTION: 'anthropic/claude-3.5-haiku',
  FALLBACK_REASONING: 'google/gemini-2.5-flash',
  FALLBACK_FAST: 'google/gemini-2.5-flash',
  EMBEDDING: 'openai/text-embedding-3-small',
};

export function resolveOpenRouterModel(role: AiModelRole, override: string | undefined): string {
  const trimmed = override?.trim();
  if (role !== 'EMBEDDING' && trimmed) {
    if (!trimmed.includes('/')) {
      throw new Error(
        `OPENROUTER_MODEL must be an OpenRouter slug (vendor/model), got "${trimmed}"`,
      );
    }
    return trimmed;
  }
  return OPENROUTER_ROLE_TO_MODEL[role] ?? 'anthropic/claude-3.5-sonnet';
}

/** Models often put raw newlines inside JSON strings; JSON.parse rejects those. */
export function escapeUnescapedJsonControls(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 32) {
      if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else out += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }
    out += ch;
  }
  return out;
}

function unwrapJsonCandidate(text: string): string {
  const trimmed = text.trim();
  const closedFence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (closedFence?.[1]) return closedFence[1].trim();
  const openFence = trimmed.match(/^```(?:json)?\s*([\s\S]*)$/i);
  if (openFence?.[1]) return openFence[1].trim();
  return trimmed;
}

export function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1');
}

function jsonCandidates(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string) => {
    if (seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };
  const variants = (value: string) => {
    push(value);
    const escaped = escapeUnescapedJsonControls(value);
    push(escaped);
    push(stripTrailingCommas(escaped));
  };
  variants(text);
  const start = text.search(/[{[]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start !== -1 && end !== -1 && end > start) {
    variants(text.slice(start, end + 1));
  }
  return out;
}

export function parseJsonSafely(text: string): unknown {
  const candidates = jsonCandidates(unwrapJsonCandidate(text));
  let lastErr: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Unable to parse JSON from model output: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

/** Gemini often emits `"title": null` for optional fields; Zod `.optional()` rejects null. */
export function stripJsonNulls(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(stripJsonNulls);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const next = stripJsonNulls(nested);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value;
}

/** Chat completions body. Disable thinking so JSON lands in `message.content`. */
export function openRouterChatPayload(input: {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature: number;
  maxTokens: number;
}): Record<string, unknown> {
  return {
    model: input.model,
    messages: input.messages,
    temperature: input.temperature,
    max_tokens: input.maxTokens,
    reasoning: { enabled: false, exclude: true },
  };
}

export function extractOpenRouterChoiceText(
  choice:
    | {
        message?: { content?: unknown; reasoning?: unknown };
      }
    | undefined,
): string {
  const fromContent = extractOpenRouterMessageContent(choice?.message?.content);
  if (fromContent.trim()) return fromContent;
  return extractOpenRouterMessageContent(choice?.message?.reasoning);
}

export function extractOpenRouterMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('');
  }
  return '';
}
