const FENCE_PATTERN = /```(\w*)[\s\r\n]*([\s\S]*?)```/g;

export type TracePromptSegment =
  { type: 'prose'; text: string } | { type: 'code'; text: string; language: string };

function cleanText(text: string): string {
  return text.replace(/\u200b/g, '').trim();
}

export function hasNonEmptyFencedCode(prompt: string): boolean {
  for (const match of prompt.matchAll(FENCE_PATTERN)) {
    if (cleanText(match[2] ?? '').length > 0) return true;
  }
  return false;
}

export function looksLikeCodeLine(line: string): boolean {
  const trimmed = cleanText(line);
  if (!trimmed) return false;
  if (
    /^(import|from|def |class |for |if |while |return |#|\/\/|const |let |var |function |public |private |@|\.\.\.)/.test(
      trimmed,
    )
  ) {
    return true;
  }
  if (/^[A-Za-z_][\w]*\s*=/.test(trimmed)) return true;
  if (/^\.\w+/.test(trimmed)) return true;
  return /[=(){}[\];]/.test(trimmed) && !/^[A-D][.)]\s/.test(trimmed);
}

function looksLikeCode(text: string): boolean {
  return text.split(/\r?\n/).some(looksLikeCodeLine);
}

function stripEmptyCodeFences(prompt: string): string {
  return prompt
    .replace(/```(\w*)[\s\r\n]*```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitFencedPromptSegments(text: string): TracePromptSegment[] {
  const segments: TracePromptSegment[] = [];
  const fence = /```(\w*)[\s\r\n]*([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null = fence.exec(text);
  while (match) {
    const before = text.slice(cursor, match.index).trim();
    if (before) segments.push({ type: 'prose', text: before });
    const code = cleanText(match[2] ?? '');
    if (code) {
      segments.push({
        type: 'code',
        language: match[1] && match[1].length > 0 ? match[1] : 'text',
        text: code,
      });
    }
    cursor = fence.lastIndex;
    match = fence.exec(text);
  }
  const rest = text.slice(cursor).trim();
  if (rest) segments.push({ type: 'prose', text: rest });
  if (segments.length === 0) segments.push({ type: 'prose', text });
  return segments;
}

function extractIndentedCodeBlock(text: string): { question: string; code: string } | null {
  const lines = text.split(/\r?\n/);
  let codeStart = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s{4,}\S/.test(lines[index] ?? '')) {
      codeStart = index;
      break;
    }
  }
  if (codeStart <= 0) return null;
  const question = lines.slice(0, codeStart).join('\n').trim();
  const code = lines
    .slice(codeStart)
    .map((line) => line.replace(/^\s{4}/, ''))
    .join('\n')
    .trim();
  return question && code ? { question, code } : null;
}

/** Wrap inline TRACE snippets in markdown fences when the LLM omitted them. */
export function normalizeTracePrompt(prompt: string): string {
  const stripped = stripEmptyCodeFences(prompt);
  const trimmed = stripped.trim();
  if (hasNonEmptyFencedCode(trimmed)) return trimmed;

  const indented = extractIndentedCodeBlock(trimmed);
  if (indented) {
    return `${indented.question}\n\`\`\`python\n${indented.code}\n\`\`\``;
  }

  const parts = trimmed.split(/\n\n+/);
  if (parts.length >= 2) {
    const question = parts[0]?.trim() ?? '';
    const rest = parts.slice(1).join('\n\n').trim();
    if (question && rest && looksLikeCode(rest)) {
      return `${question}\n\`\`\`python\n${rest}\n\`\`\``;
    }
  }

  const lines = trimmed.split(/\r?\n/);
  for (let index = 1; index < lines.length; index += 1) {
    if (looksLikeCodeLine(lines[index] ?? '')) {
      const question = lines.slice(0, index).join('\n').trim();
      const code = lines.slice(index).join('\n').trim();
      if (question && code) {
        return `${question}\n\`\`\`python\n${code}\n\`\`\``;
      }
      break;
    }
  }

  return trimmed;
}

/** Normalize and split a TRACE prompt for display, with fallbacks when code is missing. */
export function splitTracePromptForDisplay(prompt: string): TracePromptSegment[] {
  const normalized = normalizeTracePrompt(prompt);
  const segments = splitFencedPromptSegments(normalized).filter(
    (segment) => segment.type !== 'code' || cleanText(segment.text).length > 0,
  );
  if (segments.some((segment) => segment.type === 'code')) {
    return segments;
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    const [question, ...rest] = lines;
    const code = rest.join('\n').trim();
    if (question && code.length >= 8) {
      return [
        { type: 'prose', text: question },
        { type: 'code', language: 'text', text: code },
      ];
    }
  }

  if (/snippet|trace|running|following|given the|after running/i.test(normalized)) {
    return [
      { type: 'prose', text: normalized },
      {
        type: 'prose',
        text: 'The code snippet was not included in this question. Answer from the scenario described above.',
      },
    ];
  }

  return segments;
}
