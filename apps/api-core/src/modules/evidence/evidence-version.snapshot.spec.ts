import { describe, expect, it } from 'vitest';
import { hashEvidenceContent, evidenceContentEquals } from './evidence-version.snapshot.js';

const baseRow = {
  id: 'evidence-1',
  studentId: 'student-1',
  evidenceType: 'WORK_EXPERIENCE' as const,
  source: 'CANDIDATE' as const,
  sourceOwner: 'Verifier',
  sourceReference: 'verifier@example.com',
  evidenceDate: '2024-01-01',
  submissionDate: new Date('2024-01-02T00:00:00.000Z'),
  claim: 'Engineer',
  context: 'Built APIs',
  provenance: { sourceSystem: 'work-experience' },
  accessibility: 'PRIVATE',
  relatedSkillCodes: ['SKILL-B', 'SKILL-A'],
  verificationStatus: 'PENDING' as const,
  evidenceStrength: null,
  evidenceReliability: null,
  freshness: null,
  sourceEntityId: 'we-1',
  sourcePayload: { role: 'Engineer' },
  verificationMetadata: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  artifacts: [],
};

describe('evidence-version.snapshot', () => {
  it('treats skill code order as equivalent', () => {
    const left = { ...baseRow, relatedSkillCodes: ['SKILL-A', 'SKILL-B'] };
    const right = { ...baseRow, relatedSkillCodes: ['SKILL-B', 'SKILL-A'] };
    expect(evidenceContentEquals(left, right)).toBe(true);
  });

  it('detects meaningful content changes', () => {
    const changed = { ...baseRow, claim: 'Senior Engineer' };
    expect(evidenceContentEquals(baseRow, changed)).toBe(false);
    expect(hashEvidenceContent(baseRow)).not.toBe(hashEvidenceContent(changed));
  });
});
