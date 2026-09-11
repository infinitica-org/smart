import { describe, expect, it } from 'vitest';
import { buildLinkedInAddCertificationUrl } from './public-candidate-profile.dto.js';

describe('buildLinkedInAddCertificationUrl (CN-T07)', () => {
  it('builds a LinkedIn add-certification deep link with required name', () => {
    const url = buildLinkedInAddCertificationUrl({ name: 'SMART Gold — Business Analytics' });

    expect(url).toContain('https://www.linkedin.com/profile/add');
    expect(url).toContain('startTask=CERTIFICATION_NAME');
    expect(url).toContain('name=SMART+Gold');
  });

  it('includes optional organization, dates, cert URL, and cert id when provided', () => {
    const url = buildLinkedInAddCertificationUrl({
      name: 'AWS Cloud Practitioner',
      organizationName: 'Amazon Web Services',
      issueYear: 2024,
      issueMonth: 3,
      certUrl: 'https://verify.smart.example/cert/abc',
      certId: 'abc-123',
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('organizationName')).toBe('Amazon Web Services');
    expect(parsed.searchParams.get('issueYear')).toBe('2024');
    expect(parsed.searchParams.get('issueMonth')).toBe('3');
    expect(parsed.searchParams.get('certUrl')).toBe('https://verify.smart.example/cert/abc');
    expect(parsed.searchParams.get('certId')).toBe('abc-123');
  });
});
