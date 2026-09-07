import { stripJsonNulls } from './openrouter.helpers.js';

function clip(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function coerceExample(
  row: unknown,
): { input: string; output: string; explanation?: string } | null {
  if (!row || typeof row !== 'object') return null;
  const rec = row as Record<string, unknown>;
  const input = clip(text(rec.input) ?? text(rec.expected) ?? 'sample input', 800);
  const output = clip(text(rec.output) ?? text(rec.expected) ?? 'sample output', 800);
  const explanation = text(rec.explanation);
  return explanation && explanation.length >= 3
    ? { input, output, explanation: clip(explanation, 800) }
    : { input, output };
}

function coerceHidden(row: unknown): { input: string; expected: string } | null {
  if (!row || typeof row !== 'object') return null;
  const rec = row as Record<string, unknown>;
  const input = text(rec.input);
  const expected = text(rec.expected) ?? text(rec.output);
  if (!input || !expected) return null;
  return { input: clip(input, 800), expected: clip(expected, 800) };
}

function padHidden(
  hidden: Array<{ input: string; expected: string }>,
  examples: Array<{ input: string; output: string }>,
): Array<{ input: string; expected: string }> {
  const out = [...hidden];
  for (const example of examples) {
    if (out.length >= 3) break;
    out.push({ input: example.input, expected: example.output });
  }
  let n = out.length + 1;
  while (out.length < 3) {
    const seed = out[0] ?? { input: 'edge case', expected: 'handled' };
    out.push({
      input: clip(`${seed.input} #${String(n)}`, 800),
      expected: seed.expected,
    });
    n += 1;
  }
  return out.slice(0, 8);
}

function coerceOpenItem(row: Record<string, unknown>): Record<string, unknown> {
  const format = String(row.format ?? '');
  const prompt = clip(text(row.prompt) ?? 'Describe your approach to this task in detail.', 4_000);
  const rubric = clip(
    text(row.rubric) ?? 'Award marks for a concrete, correct approach with named trade-offs.',
    2_000,
  );
  const modelAnswer = clip(text(row.modelAnswer) ?? prompt.slice(0, 200), 4_000);
  const next: Record<string, unknown> = { format, prompt, rubric, modelAnswer };
  const title = text(row.title);
  if (title) next.title = clip(title, 120);
  const constraints = text(row.constraints);
  if (constraints) next.constraints = clip(constraints, 2_000);

  const examples = Array.isArray(row.examples)
    ? row.examples
        .map(coerceExample)
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  const hidden = Array.isArray(row.hiddenTests)
    ? row.hiddenTests
        .map(coerceHidden)
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  if (format === 'CODING') {
    next.title = clip(title ?? prompt.slice(0, 40), 120);
    next.constraints = clip(
      constraints ?? 'Follow the problem statement. Prefer O(n log n) or better when possible.',
      2_000,
    );
    const visible =
      examples.length >= 2
        ? examples.slice(0, 4)
        : [
            ...examples,
            { input: 'minimal valid input', output: 'correct output' },
            { input: 'edge-case input', output: 'correct edge output' },
          ].slice(0, 4);
    next.examples = visible;
    next.hiddenTests = padHidden(hidden, visible);
  } else {
    if (examples.length > 0) next.examples = examples.slice(0, 4);
    if (hidden.length > 0) next.hiddenTests = hidden.slice(0, 8);
  }
  return next;
}

function coerceClosedItem(row: Record<string, unknown>): Record<string, unknown> {
  const optionsRaw =
    row.options && typeof row.options === 'object' && !Array.isArray(row.options)
      ? (row.options as Record<string, unknown>)
      : {};
  const keys = ['A', 'B', 'C', 'D'] as const;
  const options = Object.fromEntries(
    keys.map((key) => [key, clip(text(optionsRaw[key]) ?? `Option ${key}`, 400)]),
  );
  const answer = keys.includes(row.answer as (typeof keys)[number]) ? row.answer : 'A';
  return {
    format: row.format === 'TRACE' ? 'TRACE' : 'MCQ',
    prompt: clip(text(row.prompt) ?? 'Choose the best answer for this skill check.', 2_000),
    options,
    answer,
  };
}

/** Clip/fill Gemini skill-form JSON so Zod max/min checks do not fail closed. */
export function coerceLlmJson(value: unknown): unknown {
  const root = stripJsonNulls(value);
  if (!root || typeof root !== 'object' || Array.isArray(root)) return root;
  const items = (root as { items?: unknown }).items;
  if (!Array.isArray(items)) return root;
  return {
    ...root,
    items: items.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const row = item as Record<string, unknown>;
      const format = String(row.format ?? '');
      if (format === 'MCQ' || format === 'TRACE') return coerceClosedItem(row);
      if (
        format === 'CODING' ||
        format === 'SCENARIO' ||
        format === 'DEBUG' ||
        format === 'DESIGN_REASONING'
      ) {
        return coerceOpenItem(row);
      }
      return row;
    }),
  };
}
