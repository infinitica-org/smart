import { describe, expect, it } from 'vitest';
import {
  CapabilityInferenceOutputSchema,
  coerceCapabilityInferenceOutput,
} from './capability-inference.js';

describe('capability inference output', () => {
  it('truncates overlong evidenceRefs before schema validation', () => {
    const longRef = 'x'.repeat(400);
    const coerced = coerceCapabilityInferenceOutput({
      capabilities: [
        {
          capabilityLabel: 'Implemented websocket ingest for live GPS updates',
          category: 'Backend',
          confidence: 0.7,
          proficiency: 'INTERMEDIATE',
          evidenceRefs: [longRef, 'main.py:42'],
        },
      ],
    });
    const parsed = CapabilityInferenceOutputSchema.parse(coerced);
    expect(parsed.capabilities[0]?.evidenceRefs[0]).toHaveLength(200);
    expect(parsed.capabilities[0]?.evidenceRefs[1]).toBe('main.py:42');
  });
});
