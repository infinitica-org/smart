import { describe, expect, it } from 'vitest';
import { ResumeParseDraftSchema } from '@smart/contracts';
import { coerceGoogleStructuredOutput } from './google.output-coerce.js';

describe('coerceGoogleStructuredOutput', () => {
  it('maps PROFESSIONAL technical proficiency onto ADVANCED', () => {
    const coerced = coerceGoogleStructuredOutput({
      skills: [
        { type: 'technical', name: 'TypeScript', proficiency: 'PROFESSIONAL' },
        { type: 'technical', name: 'Redis', proficiency: 'expert' },
      ],
      parseConfidence: 0.8,
    });
    const draft = ResumeParseDraftSchema.parse(coerced);
    expect(draft.skills.map((s) => s.proficiency)).toEqual(['ADVANCED', 'ADVANCED']);
  });

  it('maps language aliases without treating FLUENT as a technical enum', () => {
    const coerced = coerceGoogleStructuredOutput({
      skills: [{ type: 'language', name: 'English', proficiency: 'ADVANCED' }],
      parseConfidence: 0.7,
    });
    const draft = ResumeParseDraftSchema.parse(coerced);
    expect(draft.skills[0]).toMatchObject({ type: 'language', proficiency: 'FLUENT' });
  });

  it('leaves non-resume payloads unchanged', () => {
    const payload = { questions: [{ index: 1, text: 'What is CAP?' }] };
    expect(coerceGoogleStructuredOutput(payload)).toEqual(payload);
  });
});
