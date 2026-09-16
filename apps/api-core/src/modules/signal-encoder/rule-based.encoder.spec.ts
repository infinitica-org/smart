import { describe, expect, it } from 'vitest';
import { ACTIVE_TAXONOMY_VERSION } from '@smart/contracts';
import { RuleBasedEncoder } from './rule-based.encoder.js';
import { SkillDimensionResolver } from './skill-dimension.resolver.js';

describe('RuleBasedEncoder', () => {
  const encoder = new RuleBasedEncoder(new SkillDimensionResolver());

  it('maps GitHub Python byte-share to PYTHON_APPLICATION_BACKEND_DEVELOPMENT dimension', () => {
    const vector = encoder.encodeGithub({
      userId: '00000000-0000-4000-8000-000000000001',
      languages: [
        {
          language: 'Python',
          bytes: 50_000,
          byteShare: 0.65,
          repoCount: 3,
        },
      ],
      selectedSkillNames: [],
      encodedAt: '2026-09-11T00:00:00.000Z',
    });

    expect(vector.taxonomyVersion).toBe(ACTIVE_TAXONOMY_VERSION);
    expect(vector.sourceId).toBe('GITHUB');
    expect(vector.consentScope).toBe('github.onboarding.public_repos');
    expect(vector.fetchedAt).toBe('2026-09-11T00:00:00.000Z');
    const python = vector.entries.find(
      (e) => e.dimension.dimensionKey === 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    );
    expect(python?.score).toBeCloseTo(0.65, 2);
    expect(python?.confidence).toBeGreaterThan(0.5);
  });

  it('maps HackerRank Python tag to PYTHON_APPLICATION_BACKEND_DEVELOPMENT dimension', () => {
    const vector = encoder.encodeHackerrank({
      userId: '00000000-0000-4000-8000-000000000002',
      consentScope: 'hackerrank.profile.public',
      fetchedAt: '2026-09-11T00:00:00.000Z',
      encodedAt: '2026-09-11T00:00:00.000Z',
      payload: {
        sourceId: 'HACKERRANK',
        badges: [{ name: 'Python', level: 'gold' }],
        solvedByTag: [{ tag: 'Python', count: 25, difficulty: 'UNKNOWN' }],
      },
    });

    expect(vector.sourceId).toBe('HACKERRANK');
    expect(vector.consentScope).toBe('hackerrank.profile.public');
    const python = vector.entries.find(
      (e) => e.dimension.dimensionKey === 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    );
    expect(python?.score).toBeGreaterThan(0);
  });

  it('maps LeetCode dynamic-programming tag with activity confidence cap', () => {
    const vector = encoder.encodeLeetcode({
      userId: '00000000-0000-4000-8000-000000000003',
      consentScope: 'leetcode.profile.public',
      fetchedAt: '2026-09-11T00:00:00.000Z',
      encodedAt: '2026-09-11T00:00:00.000Z',
      payload: {
        sourceId: 'LEETCODE',
        solvedCounts: { easy: 10, medium: 5, hard: 1, total: 16 },
        tagStats: [{ tagSlug: 'dynamic-programming', problemsSolved: 12 }],
        recentActivityDays: 0,
      },
    });

    expect(vector.sourceId).toBe('LEETCODE');
    const dsa = vector.entries.find(
      (e) => e.dimension.dimensionKey === 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    );
    expect(dsa?.score).toBeGreaterThan(0);
    expect(dsa?.confidence).toBeLessThanOrEqual(0.2);
  });

  it('encodes a candidate certificate with proficiency-driven score and tier-calibrated confidence', () => {
    const vector = encoder.encodeCandidateCertificate({
      userId: '00000000-0000-4000-8000-000000000004',
      skills: [
        { skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', selfAssessedProficiency: 'EXPERT' },
      ],
      verificationTier: 'TIER_1_ISSUER_API',
      encodedAt: '2026-09-16T00:00:00.000Z',
    });

    expect(vector.sourceId).toBe('EXTERNALCERT');
    expect(vector.consentScope).toBe('certificate.candidate.declared');
    const entry = vector.entries.find(
      (e) => e.dimension.dimensionKey === 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    );
    expect(entry?.score).toBeCloseTo(0.95, 2);
    expect(entry?.confidence).toBeCloseTo(0.85, 2);
  });

  it('down-ranks a Tier 3 OCR-verified certificate to a low confidence', () => {
    const vector = encoder.encodeCandidateCertificate({
      userId: '00000000-0000-4000-8000-000000000004',
      skills: [
        { skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', selfAssessedProficiency: 'EXPERT' },
      ],
      verificationTier: 'TIER_3_OCR_HEURISTIC',
      encodedAt: '2026-09-16T00:00:00.000Z',
    });

    const entry = vector.entries[0];
    expect(entry?.score).toBeCloseTo(0.95, 2);
    expect(entry?.confidence).toBeCloseTo(0.35, 2);
  });

  it('skips certificate skills that are not valid taxonomy codes', () => {
    const vector = encoder.encodeCandidateCertificate({
      userId: '00000000-0000-4000-8000-000000000004',
      skills: [{ skillCode: 'NOT_A_REAL_SKILL_CODE', selfAssessedProficiency: 'EXPERT' }],
      verificationTier: 'TIER_1_ISSUER_API',
      encodedAt: '2026-09-16T00:00:00.000Z',
    });

    expect(vector.entries).toHaveLength(0);
  });

  it('encodes a professional credential with issuer-verified confidence', () => {
    const vector = encoder.encodeProfessionalCredential({
      userId: '00000000-0000-4000-8000-000000000005',
      coveredSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
      verificationMethod: 'ISSUER',
      encodedAt: '2026-09-16T00:00:00.000Z',
    });

    expect(vector.sourceId).toBe('PROFESSIONALCREDENTIAL');
    expect(vector.consentScope).toBe('credential.candidate.declared');
    const entry = vector.entries.find((e) => e.dimension.dimensionKey === 'SQL_QUERY_OPTIMIZATION');
    expect(entry?.score).toBeCloseTo(0.75, 2);
    expect(entry?.confidence).toBeCloseTo(0.85, 2);
  });

  it('down-ranks a document/OCR-verified professional credential', () => {
    const vector = encoder.encodeProfessionalCredential({
      userId: '00000000-0000-4000-8000-000000000005',
      coveredSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
      verificationMethod: 'DOCUMENT',
      encodedAt: '2026-09-16T00:00:00.000Z',
    });

    expect(vector.entries[0]?.confidence).toBeCloseTo(0.35, 2);
  });

  it('treats an unverified/self-attested credential as low confidence', () => {
    const vector = encoder.encodeProfessionalCredential({
      userId: '00000000-0000-4000-8000-000000000005',
      coveredSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
      verificationMethod: null,
      encodedAt: '2026-09-16T00:00:00.000Z',
    });

    expect(vector.entries[0]?.confidence).toBeCloseTo(0.3, 2);
  });
});
