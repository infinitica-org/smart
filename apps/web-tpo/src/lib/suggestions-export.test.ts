import { describe, expect, it } from 'vitest';
import type { CandidateMatchDto, JobOpeningDto } from '@smart/contracts';
import {
  buildSuggestionsCsv,
  buildSuggestionsPdf,
  type SuggestionExportRow,
} from './suggestions-export';

const opening: JobOpeningDto = {
  openingId: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domain: 'SOFTWARE_IT',
  requiredSkills: [],
  minYearsExperience: 1,
  maxYearsExperience: 3,
  location: 'Coimbatore',
  employmentType: 'FULL_TIME',
  headcount: 2,
  status: 'OPEN',
  createdAt: '2026-09-02T05:30:00.000Z',
};

const candidate = (overrides: Partial<CandidateMatchDto> = {}): CandidateMatchDto => ({
  studentId: '33333333-3333-4333-8333-333333333333',
  studentName: 'Aarav Sharma',
  trackCode: 'TECH_FULLSTACK',
  certificateId: null,
  highestLevelCleared: 3,
  headlineTier: 'GOLD',
  similarityScore: 0.9,
  matchScore: 0.92,
  method: 'RULES',
  explanation: {
    thresholdsMet: [],
    thresholdsMissed: [],
    strongCompetencies: ['API design'],
    gapCompetencies: [],
    why: 'Strong backend fundamentals with verified system design skills.',
  },
  ...overrides,
});

const rows: SuggestionExportRow[] = [{ rank: 1, candidate: candidate(), sent: true }];

describe('buildSuggestionsCsv', () => {
  it('includes opening/opportunity details as a header block', () => {
    const csv = buildSuggestionsCsv(opening, rows);
    expect(csv).toContain('Company,"Infinitica Labs"');
    expect(csv).toContain('Role,"Backend Engineer"');
    expect(csv).toContain('Location,"Coimbatore"');
    expect(csv).toContain('Headcount,2');
  });

  it('lists each candidate with match percentage and sent status', () => {
    const csv = buildSuggestionsCsv(opening, rows);
    expect(csv).toContain('"Aarav Sharma"');
    expect(csv).toContain('"TECH_FULLSTACK"');
    expect(csv).toContain('"GOLD"');
    expect(csv).toContain('92');
    expect(csv).toContain('"Opportunity sent"');
  });

  it('marks a candidate that has not been sent an opportunity', () => {
    const csv = buildSuggestionsCsv(opening, [{ rank: 1, candidate: candidate(), sent: false }]);
    expect(csv).toContain('"Not sent"');
  });

  it('starts with a UTF-8 BOM for Excel compatibility', () => {
    const csv = buildSuggestionsCsv(opening, rows);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('prefers the recruiter summary over the plain why-text when present', () => {
    const csv = buildSuggestionsCsv(opening, [
      {
        rank: 1,
        candidate: candidate({
          explanation: { ...candidate().explanation, recruiterSummary: 'Recruiter-facing pitch.' },
        }),
        sent: false,
      },
    ]);
    expect(csv).toContain('Recruiter-facing pitch.');
  });

  it('falls back to a generated why-text when there is no explanation at all', () => {
    const csv = buildSuggestionsCsv(opening, [
      {
        rank: 1,
        candidate: candidate({
          explanation: { ...candidate().explanation, why: undefined, recruiterSummary: undefined },
        }),
        sent: false,
      },
    ]);
    expect(csv).toContain('Matched based on GOLD tier status and Level 3 clearance.');
  });
});

describe('buildSuggestionsPdf', () => {
  it('builds a downloadable PDF document without throwing', () => {
    const doc = buildSuggestionsPdf(opening, rows);
    const blob = doc.output('blob');
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');
  });
});
