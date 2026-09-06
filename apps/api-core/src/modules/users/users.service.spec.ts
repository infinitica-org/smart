import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service.js';

function studentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    email: 'student@example.com',
    fullName: 'Test Student',
    role: 'STUDENT',
    provider: 'PASSWORD',
    emailVerified: true,
    institutionId: null,
    createdAt: new Date(),
    passwordHash: null,
    heldAt: null,
    onboardingCompleted: false,
    onboardingDetails: null,
    dpdpConsentAt: null,
    institution: null,
    company: null,
    primaryTrack: null,
    secondaryTrack: null,
    ...overrides,
  };
}

describe('UsersService completeOnboarding', () => {
  const auth = { revokeAllForUser: vi.fn() };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const assessment = { declareSkillClaim: vi.fn().mockResolvedValue(undefined) };
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    outbox.enqueueEnvelope.mockClear();
    assessment.declareSkillClaim.mockClear();
    assessment.declareSkillClaim.mockResolvedValue(undefined);
    service = new UsersService(
      prisma as never,
      auth as never,
      outbox as never,
      assessment as never,
    );
  });

  it('rejects payloads without DPDP consent', async () => {
    await expect(
      service.completeOnboarding(randomUUID(), {
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        linkedinUrl: 'https://www.linkedin.com/in/ada',
        jobPreferences: {
          expectedCtcLakhs: 8,
          currentLocation: 'Bengaluru',
          preferredLocations: ['Bengaluru'],
          preferredWorkModes: ['FULL_TIME'],
        },
        dpdpConsent: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists profile, consent, and onboardingCompleted=true', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...user,
      ...data,
      onboardingCompleted: true,
      institution: null,
      company: null,
      primaryTrack: null,
      secondaryTrack: null,
    }));

    const result = await service.completeOnboarding(user.id, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneCountryCode: '+91',
      phoneNumber: '9876543210',
      linkedinUrl: 'https://www.linkedin.com/in/ada',
      githubUrl: 'https://github.com/ada',
      education: [],
      experiences: [],
      skills: [{ type: 'language', name: 'English', proficiency: 'Fluent' }],
      jobPreferences: {
        expectedCtcLakhs: 8,
        currentLocation: 'Bengaluru',
        preferredLocations: ['Bengaluru'],
        preferredWorkModes: ['FULL_TIME'],
      },
      dpdpConsent: true,
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
        data: expect.objectContaining({
          onboardingCompleted: true,
          fullName: 'Ada Lovelace',
          dpdpConsentAt: expect.any(Date),
          onboardingDetails: expect.objectContaining({ githubUrl: 'https://github.com/ada' }),
        }),
      }),
    );
    expect(result.onboardingCompleted).toBe(true);
  });

  it('enqueues candidate.skills_discovered only for skills the candidate kept selected', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce({
      ...user,
      onboardingCompleted: true,
      institution: null,
      company: null,
      primaryTrack: null,
      secondaryTrack: null,
    });

    await service.completeOnboarding(user.id, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneCountryCode: '+91',
      phoneNumber: '9876543210',
      linkedinUrl: 'https://www.linkedin.com/in/ada',
      education: [],
      experiences: [],
      skills: [],
      jobPreferences: {
        expectedCtcLakhs: 8,
        currentLocation: 'Bengaluru',
        preferredLocations: ['Bengaluru'],
        preferredWorkModes: ['FULL_TIME'],
      },
      skillDiscovery: {
        suggestedFromGithub: [
          { language: 'TypeScript', bytes: 900, byteShare: 0.9, repoCount: 3 },
          { language: 'CSS', bytes: 100, byteShare: 0.1, repoCount: 1 },
        ],
        // CSS was suggested but the candidate unchecked it — must not be sent downstream.
        selectedSkillNames: ['TypeScript'],
        customSkillNames: [],
      },
      dpdpConsent: true,
    });

    expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    const call = outbox.enqueueEnvelope.mock.calls[0][0] as { data: { languages: unknown[] } };
    expect(call.data.languages).toEqual([
      { language: 'TypeScript', bytes: 900, byteShare: 0.9, repoCount: 3 },
    ]);
  });

  it('does not enqueue candidate.skills_discovered when no skills were selected', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce({
      ...user,
      onboardingCompleted: true,
      institution: null,
      company: null,
      primaryTrack: null,
      secondaryTrack: null,
    });

    await service.completeOnboarding(user.id, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneCountryCode: '+91',
      phoneNumber: '9876543210',
      linkedinUrl: 'https://www.linkedin.com/in/ada',
      education: [],
      experiences: [],
      skills: [],
      jobPreferences: {
        expectedCtcLakhs: 8,
        currentLocation: 'Bengaluru',
        preferredLocations: ['Bengaluru'],
        preferredWorkModes: ['FULL_TIME'],
      },
      dpdpConsent: true,
    });

    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('declares a SkillClaim for a mandatory catalog skill by matching its name', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce({
      ...user,
      onboardingCompleted: true,
      institution: null,
      company: null,
      primaryTrack: null,
      secondaryTrack: null,
    });

    await service.completeOnboarding(user.id, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneCountryCode: '+91',
      phoneNumber: '9876543210',
      linkedinUrl: 'https://www.linkedin.com/in/ada',
      education: [],
      experiences: [],
      skills: [
        { type: 'technical', name: 'Git & version control', proficiency: 'INTERMEDIATE' },
        // A per-item language pick never matches a catalog name, so it must
        // not become a SkillClaim yet (no per-language codes in the catalog).
        { type: 'technical', name: 'Python', proficiency: 'ADVANCED' },
      ],
      jobPreferences: {
        expectedCtcLakhs: 8,
        currentLocation: 'Bengaluru',
        preferredLocations: ['Bengaluru'],
        preferredWorkModes: ['FULL_TIME'],
      },
      dpdpConsent: true,
    });

    expect(assessment.declareSkillClaim).toHaveBeenCalledTimes(1);
    expect(assessment.declareSkillClaim).toHaveBeenCalledWith(
      { sub: user.id, role: 'STUDENT', inst: null },
      { skillCode: 'GIT_VERSION_CONTROL', proficiency: 'INTERMEDIATE' },
    );
  });

  it('tolerates an already-claimed mandatory skill without failing completion', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce({
      ...user,
      onboardingCompleted: true,
      institution: null,
      company: null,
      primaryTrack: null,
      secondaryTrack: null,
    });
    assessment.declareSkillClaim.mockRejectedValueOnce(
      new ConflictException({ error: 'skill_already_claimed' }),
    );

    const result = await service.completeOnboarding(user.id, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneCountryCode: '+91',
      phoneNumber: '9876543210',
      linkedinUrl: 'https://www.linkedin.com/in/ada',
      education: [],
      experiences: [],
      skills: [{ type: 'technical', name: 'Git & version control', proficiency: 'INTERMEDIATE' }],
      jobPreferences: {
        expectedCtcLakhs: 8,
        currentLocation: 'Bengaluru',
        preferredLocations: ['Bengaluru'],
        preferredWorkModes: ['FULL_TIME'],
      },
      dpdpConsent: true,
    });

    expect(result.onboardingCompleted).toBe(true);
  });
});

describe('UsersService saveOnboardingDraft', () => {
  const auth = { revokeAllForUser: vi.fn() };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const assessment = { declareSkillClaim: vi.fn().mockResolvedValue(undefined) };
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new UsersService(
      prisma as never,
      auth as never,
      outbox as never,
      assessment as never,
    );
  });

  it('rejects an invalid draft payload', async () => {
    await expect(
      service.saveOnboardingDraft(randomUUID(), { firstName: 42 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects saving a draft once onboarding is already complete', async () => {
    const user = studentRow({ onboardingCompleted: true });
    prisma.user.findUnique.mockResolvedValueOnce(user);

    await expect(service.saveOnboardingDraft(user.id, { firstName: 'Ada' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('merges partial fields into onboardingDetails without completing onboarding', async () => {
    const user = studentRow({ onboardingDetails: { firstName: 'Ada', linkedinUrl: '' } });
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce(user);

    const result = await service.saveOnboardingDraft(user.id, {
      lastName: 'Lovelace',
      githubUrl: 'https://github.com/ada',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
        data: {
          onboardingDetails: expect.objectContaining({
            firstName: 'Ada',
            lastName: 'Lovelace',
            githubUrl: 'https://github.com/ada',
            savedAt: expect.any(String),
          }),
        },
      }),
    );
    expect(result.onboardingCompleted).toBe(false);
    expect(result.profile).toBeNull();
    expect(result.draft?.firstName).toBe('Ada');
    expect(result.draft?.lastName).toBe('Lovelace');
  });
});
