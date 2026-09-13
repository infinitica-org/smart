import { describe, expect, it } from 'vitest';
import {
  hasNonEmptyFencedCode,
  normalizeTracePrompt,
  splitTracePromptForDisplay,
} from './trace-prompt.js';

describe('normalizeTracePrompt', () => {
  it('keeps prompts that already include fenced code', () => {
    const prompt = 'What prints?\n```js\nconsole.log(1)\n```';
    expect(normalizeTracePrompt(prompt)).toBe(prompt);
    expect(hasNonEmptyFencedCode(prompt)).toBe(true);
  });

  it('wraps inline code after a blank line', () => {
    const prompt =
      'What shape does X have?\n\nfrom sklearn.pipeline import FeatureUnion\nunion = FeatureUnion([])';
    expect(normalizeTracePrompt(prompt)).toBe(
      'What shape does X have?\n```python\nfrom sklearn.pipeline import FeatureUnion\nunion = FeatureUnion([])\n```',
    );
  });

  it('wraps code that starts on the line after the question', () => {
    const prompt = 'What is printed?\nimport numpy as np\nprint(np.array([1]).shape)';
    expect(normalizeTracePrompt(prompt)).toBe(
      'What is printed?\n```python\nimport numpy as np\nprint(np.array([1]).shape)\n```',
    );
  });

  it('leaves prose-only prompts unchanged', () => {
    const prompt = 'Which option best describes feature scaling?';
    expect(normalizeTracePrompt(prompt)).toBe(prompt);
  });

  it('strips empty fences and wraps the remaining inline code', () => {
    const prompt =
      'What shape does X have?\n```python\n```\nfrom sklearn.pipeline import FeatureUnion\nunion = FeatureUnion([])';
    expect(normalizeTracePrompt(prompt)).toContain('from sklearn.pipeline import FeatureUnion');
    expect(hasNonEmptyFencedCode(normalizeTracePrompt(prompt))).toBe(true);
  });

  it('falls back to a missing-snippet note when no code is present', () => {
    const segments = splitTracePromptForDisplay(
      'What shape does X_transformed have after running Imputer and StandardScaler in a FeatureUnion?',
    );
    expect(segments.some((segment) => segment.text.includes('not included'))).toBe(true);
  });
});
