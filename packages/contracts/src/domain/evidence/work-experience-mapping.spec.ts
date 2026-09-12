import { describe, expect, it } from 'vitest';
import {
  buildWorkExperienceEvidence,
  deriveSkillMappingsFromWorkExperience,
  mapWeStatusToEvidenceVerification,
  relatedSkillCodesFromWorkExperience,
} from './work-experience-mapping.js';

describe('work-experience evidence mapping', () => {
  const baseSource = {
    id: '00000000-0000-4000-8000-000000000001',
    companyName: 'Acme Corp',
    role: 'Backend Engineer',
    employmentType: 'FULL_TIME' as const,
    startDate: '2022-01-01T00:00:00.000Z',
    endDate: '2023-01-01T00:00:00.000Z',
    workLocation: 'Bengaluru',
    department: 'Platform',
    responsibilities: 'Built APIs.',
    skillsClaimed: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
    status: 'SUBMITTED' as const,
    verifierName: 'Jane Manager',
    verifierEmail: 'jane@acme.com',
    verifierDesignation: 'Engineering Manager',
    verifierPhone: '+911234567890',
  };

  it('maps WE verification statuses to evidence statuses', () => {
    expect(mapWeStatusToEvidenceVerification('VERIFIED')).toBe('VERIFIED');
    expect(mapWeStatusToEvidenceVerification('PENDING_EMPLOYER')).toBe('PROVISIONAL');
    expect(mapWeStatusToEvidenceVerification('REJECTED')).toBe('REJECTED');
    expect(mapWeStatusToEvidenceVerification('SUBMITTED')).toBe('PENDING');
  });

  it('derives skill mappings from responsibilities when explicit mappings absent', () => {
    const mappings = deriveSkillMappingsFromWorkExperience({
      skillsClaimed: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      structuredResponsibilities: [
        {
          task: 'Owned auth service',
          personalContribution: 'Designed and shipped OAuth2 flow',
          responsibilityLevel: 'OWNED',
          skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        },
      ],
    });
    expect(mappings).toEqual([
      expect.objectContaining({
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        responsibilityLevel: 'OWNED',
      }),
    ]);
  });

  it('falls back to skillsClaimed when no structured responsibilities', () => {
    expect(
      deriveSkillMappingsFromWorkExperience({
        skillsClaimed: ['SQL_QUERY_OPTIMIZATION'],
        structuredResponsibilities: [],
      }),
    ).toEqual([{ skillCode: 'SQL_QUERY_OPTIMIZATION' }]);
  });

  it('builds a full WorkExperienceEvidence object', () => {
    const evidence = buildWorkExperienceEvidence({
      ...baseSource,
      structuredResponsibilities: [
        {
          task: 'Owned auth service',
          personalContribution: 'Designed OAuth2 flow',
          responsibilityLevel: 'OWNED',
          skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        },
      ],
      deliverables: ['Auth microservice v2'],
    });
    expect(evidence.experienceId).toBe(baseSource.id);
    expect(evidence.responsibilities).toHaveLength(1);
    expect(evidence.deliverables).toEqual(['Auth microservice v2']);
    expect(evidence.employmentVerification?.verificationStatus).toBe('PENDING');
  });

  it('collects related skill codes from derived mappings', () => {
    expect(relatedSkillCodesFromWorkExperience(baseSource)).toEqual([
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    ]);
  });
});
