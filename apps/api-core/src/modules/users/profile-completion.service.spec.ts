import { describe, expect, it, vi } from 'vitest';
import { ProfileCompletionService } from './profile-completion.service.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';

function completeUser() {
  return {
    onboardingCompleted: true,
    onboardingDetails: {
      interestDomain: 'CS_IT',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneCountryCode: '+91',
      phoneNumber: '9876543210',
      dpdpConsent: true,
      dpdpConsentAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:00.000Z',
      linkedinUrl: 'https://linkedin.com/in/ada',
      jobPreferences: {
        expectedCtcLakhs: 8,
        currentLocation: 'Bengaluru',
        preferredLocations: ['Bengaluru'],
      },
    },
  };
}

function completePrismaMocks() {
  return {
    user: { findUnique: vi.fn().mockResolvedValue(completeUser()) },
    skillClaim: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: '22222222-2222-4222-8222-222222222222',
          studentId: STUDENT_ID,
          proficiency: 'BEGINNER',
          status: 'DECLARED',
          strikes: 0,
          lockedUntil: null,
          lastAttemptId: null,
          sourceMetadata: {},
          skill: { code: 'GIT_VERSION_CONTROL' },
        },
      ]),
    },
    candidateLanguage: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: 'lang-1', language: 'English', proficiency: 'FLUENT' }]),
    },
    candidateEducation: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'edu-1',
          institutionName: 'MIT',
          degree: 'BSc',
          fieldOfStudy: 'CS',
          startYear: 2020,
          endYear: 2024,
          grade: 'A',
        },
      ]),
    },
    workExperience: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'exp-1',
          companyName: 'Acme',
          role: 'Intern',
          startDate: new Date('2024-01-01'),
          endDate: null,
          isCurrent: true,
          status: 'VERIFIED',
        },
      ]),
    },
    project: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'prj-1',
          title: 'App',
          outcome: 'Shipped',
          stack: ['TS'],
          githubUrl: null,
          liveUrl: null,
          status: 'VERIFIED',
        },
      ]),
    },
    candidateCertificate: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'cert-1',
          title: 'AWS',
          issuer: 'Amazon',
          issueDate: new Date('2025-01-01'),
          status: 'VERIFIED',
        },
      ]),
    },
  };
}

describe('ProfileCompletionService', () => {
  it('reports 100% when all eight areas are present', async () => {
    const prisma = completePrismaMocks();
    const service = new ProfileCompletionService(prisma as never);

    const progress = await service.getProgressForStudent(STUDENT_ID);

    expect(progress.percent).toBe(100);
    expect(await service.isCompleteForSkillVerification(STUDENT_ID)).toBe(true);
  });

  it('reports 88% when one area is missing and still allows verification at 50% gate', async () => {
    const prisma = completePrismaMocks();
    prisma.candidateCertificate.findMany.mockResolvedValue([]);
    const service = new ProfileCompletionService(prisma as never);

    const progress = await service.getProgressForStudent(STUDENT_ID);

    expect(progress.percent).toBe(88);
    expect(await service.isCompleteForSkillVerification(STUDENT_ID)).toBe(true);
  });

  it('throws profile_incomplete when profile is below 50%', async () => {
    const prisma = completePrismaMocks();
    prisma.workExperience.findMany.mockResolvedValue([]);
    prisma.project.findMany.mockResolvedValue([]);
    prisma.candidateCertificate.findMany.mockResolvedValue([]);
    prisma.user.findUnique.mockResolvedValue({
      onboardingCompleted: true,
      onboardingDetails: {
        interestDomain: 'CS_IT',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        dpdpConsent: true,
        dpdpConsentAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    const service = new ProfileCompletionService(prisma as never);

    const progress = await service.getProgressForStudent(STUDENT_ID);
    expect(progress.percent).toBe(38);

    await expect(service.assertCompleteForSkillVerification(STUDENT_ID)).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'profile_incomplete',
        message: 'Reach at least 50% profile completion to unlock skill verification.',
      }),
    });
  });
});
