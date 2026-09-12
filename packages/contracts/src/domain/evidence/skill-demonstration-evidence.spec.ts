import { describe, expect, it } from 'vitest';
import {
  qualifiesAsProvisionalDemonstrationEvidence,
  qualifiesAsSkillDemonstrationEvidence,
} from './skill-demonstration-evidence.js';

describe('qualifiesAsSkillDemonstrationEvidence', () => {
  it('accepts verified project evidence for the target skill', () => {
    expect(
      qualifiesAsSkillDemonstrationEvidence({
        evidenceType: 'PROJECT',
        relatedSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
        catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
        verificationStatus: 'VERIFIED',
      }),
    ).toBe(true);
  });

  it('rejects self-report even when linked', () => {
    expect(
      qualifiesAsSkillDemonstrationEvidence({
        evidenceType: 'SELF_REPORT',
        relatedSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
        catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
        verificationStatus: 'VERIFIED',
      }),
    ).toBe(false);
  });

  it('rejects work experience pending employer verification', () => {
    expect(
      qualifiesAsSkillDemonstrationEvidence({
        evidenceType: 'WORK_EXPERIENCE',
        relatedSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
        catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
        verificationStatus: 'PROVISIONAL',
      }),
    ).toBe(false);
  });

  it('accepts provisional work experience for provisional settlement', () => {
    expect(
      qualifiesAsProvisionalDemonstrationEvidence({
        evidenceType: 'WORK_EXPERIENCE',
        relatedSkillCodes: ['SQL_QUERY_OPTIMIZATION'],
        catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
        verificationStatus: 'PROVISIONAL',
      }),
    ).toBe(true);
  });

  it('rejects evidence linked to a different skill', () => {
    expect(
      qualifiesAsSkillDemonstrationEvidence({
        evidenceType: 'WORK_EXPERIENCE',
        relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
        verificationStatus: 'VERIFIED',
      }),
    ).toBe(false);
  });
});
