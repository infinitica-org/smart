import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
    service = new UsersService(prisma as never, auth as never);
  });

  it('rejects payloads without DPDP consent', async () => {
    await expect(
      service.completeOnboarding(randomUUID(), {
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        linkedinUrl: 'https://www.linkedin.com/in/ada',
        preferences: ['Coding'],
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
      preferences: ['Coding'],
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
});

describe('UsersService saveOnboardingDraft', () => {
  const auth = { revokeAllForUser: vi.fn() };
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
    service = new UsersService(prisma as never, auth as never);
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
