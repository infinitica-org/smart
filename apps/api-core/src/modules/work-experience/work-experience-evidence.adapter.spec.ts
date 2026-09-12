import { describe, expect, it } from 'vitest';
import {
  buildEvidenceFromWorkExperienceRow,
  mapStructuredResponsibilities,
  responsibilityRowsCreateInput,
  structuredMetadataWriteData,
} from './work-experience-evidence.adapter.js';

describe('work-experience-evidence.adapter', () => {
  const baseRow = {
    id: '00000000-0000-4000-8000-000000000001',
    studentId: '00000000-0000-4000-8000-000000000099',
    companyName: 'Acme Corp',
    role: 'Backend Engineer',
    employmentType: 'FULL_TIME' as const,
    startDate: new Date('2022-01-01T00:00:00.000Z'),
    endDate: new Date('2023-01-01T00:00:00.000Z'),
    workLocation: 'Bengaluru',
    department: 'Platform',
    responsibilities: 'Built APIs.',
    skills: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
    status: 'VERIFIED' as const,
    verifierName: 'Jane Manager',
    verifierEmail: 'jane@acme.com',
    verifierDesignation: 'Engineering Manager',
    verifierPhone: '+911234567890',
    deliverablesStructured: ['Auth microservice v2'],
    personalContributions: [
      {
        whatWasDone: 'Designed OAuth2 flow',
        personalContribution: 'Owned auth module rollout',
        responsibilityLevel: 'OWNED',
      },
    ],
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
    structuredResponsibilities: [
      {
        id: '00000000-0000-4000-8000-000000000002',
        experienceId: '00000000-0000-4000-8000-000000000001',
        task: 'Owned auth service',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        personalContribution: 'Designed and shipped OAuth2 flow',
        responsibilityLevel: 'OWNED',
        independence: null,
        tools: ['NestJS'],
        decision: null,
        constraintText: null,
        outcome: 'Shipped on schedule',
        artifactId: null,
        activity: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  it('maps a prisma row to WorkExperienceEvidence', () => {
    const evidence = buildEvidenceFromWorkExperienceRow(baseRow);
    expect(evidence?.experienceId).toBe(baseRow.id);
    expect(evidence?.employer).toBe('Acme Corp');
    expect(evidence?.responsibilities).toHaveLength(1);
    expect(evidence?.deliverables).toEqual(['Auth microservice v2']);
    expect(evidence?.employmentVerification?.verificationStatus).toBe('VERIFIED');
    expect(evidence?.skillMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
          responsibilityLevel: 'OWNED',
        }),
      ]),
    );
  });

  it('maps structured responsibility rows through the evidence mapper', () => {
    const mapped = mapStructuredResponsibilities(baseRow.structuredResponsibilities);
    expect(mapped[0]).toEqual(
      expect.objectContaining({
        task: 'Owned auth service',
        responsibilityLevel: 'OWNED',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      }),
    );
  });

  it('writes deliverables and personal contributions to prisma fields', () => {
    expect(
      structuredMetadataWriteData({
        deliverables: ['API v2'],
        personalContributions: [
          {
            whatWasDone: 'Led rollout',
            personalContribution: 'Coordinated zero-downtime deploy',
            responsibilityLevel: 'OWNED',
          },
        ],
      }),
    ).toEqual({
      deliverablesStructured: ['API v2'],
      personalContributions: [
        {
          whatWasDone: 'Led rollout',
          personalContribution: 'Coordinated zero-downtime deploy',
          responsibilityLevel: 'OWNED',
        },
      ],
    });
  });

  it('builds responsibility create inputs for child rows', () => {
    const rows = responsibilityRowsCreateInput(baseRow.id, [
      {
        task: 'Owned auth service',
        personalContribution: 'Designed OAuth2 flow',
        responsibilityLevel: 'OWNED',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        tools: ['NestJS'],
      },
    ]);
    expect(rows).toEqual([
      expect.objectContaining({
        experienceId: baseRow.id,
        task: 'Owned auth service',
        responsibilityLevel: 'OWNED',
        tools: ['NestJS'],
      }),
    ]);
  });
});
