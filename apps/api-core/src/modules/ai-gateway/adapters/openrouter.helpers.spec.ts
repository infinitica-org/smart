import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  extractOpenRouterChoiceText,
  extractOpenRouterMessageContent,
  openRouterChatPayload,
  parseJsonSafely,
  resolveOpenRouterModel,
  stripJsonNulls,
} from './openrouter.helpers.js';

describe('resolveOpenRouterModel', () => {
  it('uses OPENROUTER_MODEL for chat roles when it is a vendor/model slug', () => {
    expect(resolveOpenRouterModel('PRIMARY_REASONING', 'google/gemini-2.0-flash-001')).toBe(
      'google/gemini-2.0-flash-001',
    );
  });

  it('rejects a Gemini-native id that is not an OpenRouter slug', () => {
    expect(() => resolveOpenRouterModel('PRIMARY_REASONING', 'gemini-2.0-flash')).toThrow(
      /vendor\/model/,
    );
  });

  it('does not apply OPENROUTER_MODEL to embeddings', () => {
    expect(resolveOpenRouterModel('EMBEDDING', 'google/gemini-2.0-flash-001')).toBe(
      'openai/text-embedding-3-small',
    );
  });
});

describe('parseJsonSafely', () => {
  it('unwraps fenced JSON used by many OpenRouter models', () => {
    const parsed = parseJsonSafely('```json\n{"items":[{"format":"MCQ"}]}\n```');
    expect(parsed).toEqual({ items: [{ format: 'MCQ' }] });
  });

  it('salvages JSON when the model adds a short preface', () => {
    const parsed = parseJsonSafely('Here you go:\n{"ok":true}');
    expect(parsed).toEqual({ ok: true });
  });

  it('escapes raw newlines that Gemini puts inside JSON strings', () => {
    const parsed = parseJsonSafely('{"prompt":"line1\nline2"}');
    expect(parsed).toEqual({ prompt: 'line1\nline2' });
  });

  it('unwraps a truncated markdown fence without a closing fence', () => {
    const parsed = parseJsonSafely('```json\n{"ok":true}');
    expect(parsed).toEqual({ ok: true });
  });

  it('accepts a trailing comma that Gemini often leaves in objects', () => {
    expect(parseJsonSafely('{"ok":true,}')).toEqual({ ok: true });
  });
});

describe('extractOpenRouterMessageContent', () => {
  it('joins multipart message content', () => {
    expect(
      extractOpenRouterMessageContent([
        { type: 'text', text: '{"a":' },
        { type: 'text', text: '1}' },
      ]),
    ).toBe('{"a":1}');
  });
});

describe('extractOpenRouterChoiceText', () => {
  it('falls back to reasoning when content is empty (thinking models)', () => {
    expect(
      extractOpenRouterChoiceText({
        message: { content: '', reasoning: '{"items":[]}' },
      }),
    ).toBe('{"items":[]}');
  });
});

describe('openRouterChatPayload', () => {
  it('disables reasoning so Gemini Flash-Lite puts JSON in content', () => {
    const body = openRouterChatPayload({
      model: 'google/gemini-3.5-flash-lite',
      messages: [{ role: 'user', content: 'x' }],
      temperature: 0,
      maxTokens: 100,
    });
    expect(body.reasoning).toEqual({ enabled: false, exclude: true });
  });
});

describe('stripJsonNulls', () => {
  it('drops null optional fields that Zod optional() would reject', () => {
    const schema = z.object({
      items: z.array(
        z.object({
          format: z.string(),
          prompt: z.string(),
          title: z.string().min(3).optional(),
          constraints: z.string().min(8).optional(),
        }),
      ),
    });
    const parsed = stripJsonNulls({
      items: [
        {
          format: 'SCENARIO',
          prompt: 'You are developing a simple web application.',
          title: null,
          constraints: null,
        },
      ],
    });
    expect(schema.parse(parsed).items[0]).toEqual({
      format: 'SCENARIO',
      prompt: 'You are developing a simple web application.',
    });
  });
});

describe('skill-form schema still applies after salvage', () => {
  it('parses a closed-form payload from a fenced string', () => {
    const schema = z.object({
      items: z.array(z.object({ format: z.string(), prompt: z.string().min(12) })).min(1),
    });
    const parsed = parseJsonSafely(
      '```json\n{"items":[{"format":"MCQ","prompt":"What does await do?"}]}```',
    );
    expect(schema.parse(parsed).items).toHaveLength(1);
  });
});
