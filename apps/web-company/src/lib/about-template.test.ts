import { describe, expect, it } from 'vitest';
import { buildAboutDraft } from './about-template';

describe('buildAboutDraft', () => {
  it('uses only the details provided', () => {
    expect(
      buildAboutDraft({
        name: 'Acme Labs',
        industry: 'Software',
        location: 'Pune',
        size: '51–200 employees',
      }),
    ).toBe(
      'Acme Labs is a company in Software, based in Pune, with 51–200 employees. We hire verified graduates and student talent through SMART competency credentials.',
    );
  });

  it('skips blank details and never invents them', () => {
    const text = buildAboutDraft({ name: 'Acme Labs', industry: '  ', location: '' });
    expect(text.startsWith('Acme Labs is a company.')).toBe(true);
    expect(text).not.toContain('based in');
  });

  it('returns nothing without a company name', () => {
    expect(buildAboutDraft({ name: ' ' })).toBe('');
  });
});
