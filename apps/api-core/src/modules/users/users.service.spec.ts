import { randomUUID } from 'node:crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../auth/auth.service.js';
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

function minimalCompletion(overrides: Record<string, unknown> = {}) {
  return {
    interestDomain: 'CS_IT',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneCountryCode: '+91',
    phoneNumber: '9876543210',
    dpdpConsent: true as const,
    ...overrides,
  };
}

function mockCompletedUpdate(
  prismaRef: { user: { update: ReturnType<typeof vi.fn> } },
  user: ReturnType<typeof studentRow>,
) {
  prismaRef.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    ...user,
    ...data,
    onboardingCompleted: true,
    institution: null,
    company: null,
    primaryTrack: null,
    secondaryTrack: null,
  }));
}

function mockStorage() {
  return {
    upload: vi.fn().mockResolvedValue('profile-photos/user-id/photo.jpg'),
    getSignedDownloadUrl: vi
      .fn()
      .mockResolvedValue('https://storage.example/profile-photos/user-id/photo.jpg'),
  };
}

describe('UsersService completeOnboarding', () => {
  const auth = { revokeAllForUser: vi.fn() };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const storage = mockStorage();
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
    service = new UsersService(prisma as never, auth as never, outbox as never, storage as never);
  });

  it('accepts valid minimal completion and sets onboardingCompleted=true', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    const result = await service.completeOnboarding(user.id, minimalCompletion());

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
        data: expect.objectContaining({
          onboardingCompleted: true,
          fullName: 'Ada Lovelace',
          dpdpConsentAt: expect.any(Date),
          onboardingDetails: expect.objectContaining({
            interestDomain: 'CS_IT',
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneCountryCode: '+91',
            phoneNumber: '9876543210',
            dpdpConsent: true,
          }),
        }),
      }),
    );
    expect(result.onboardingCompleted).toBe(true);
  });

  it('rejects completion when interestDomain is missing', async () => {
    const { interestDomain: _removed, ...payload } = minimalCompletion();
    await expect(service.completeOnboarding(randomUUID(), payload)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects completion when firstName is missing', async () => {
    await expect(
      service.completeOnboarding(randomUUID(), minimalCompletion({ firstName: '' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects completion when lastName is missing', async () => {
    await expect(
      service.completeOnboarding(randomUUID(), minimalCompletion({ lastName: '' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects completion when phoneCountryCode is missing', async () => {
    await expect(
      service.completeOnboarding(randomUUID(), minimalCompletion({ phoneCountryCode: '' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects completion when phoneNumber is missing', async () => {
    await expect(
      service.completeOnboarding(randomUUID(), minimalCompletion({ phoneNumber: '' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects payloads without DPDP consent', async () => {
    await expect(
      service.completeOnboarding(randomUUID(), minimalCompletion({ dpdpConsent: false })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not require jobPreferences', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await expect(service.completeOnboarding(user.id, minimalCompletion())).resolves.toMatchObject({
      onboardingCompleted: true,
    });
  });

  it('does not require skills', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    const result = await service.completeOnboarding(user.id, minimalCompletion());

    expect(result.onboardingCompleted).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingDetails: expect.objectContaining({ skills: [] }),
        }),
      }),
    );
  });

  it('does not require social information', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await expect(service.completeOnboarding(user.id, minimalCompletion())).resolves.toMatchObject({
      onboardingCompleted: true,
    });
  });

  it('does not require education or experiences', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(user.id, minimalCompletion());

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingDetails: expect.objectContaining({
            education: [],
            experiences: [],
          }),
        }),
      }),
    );
  });

  it('persists optional deferred profile fields when supplied', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(
      user.id,
      minimalCompletion({
        linkedinUrl: 'https://www.linkedin.com/in/ada',
        githubUrl: 'https://github.com/ada',
        skills: [{ type: 'language', name: 'English', proficiency: 'Fluent' }],
        jobPreferences: {
          expectedCtcLakhs: 8,
          currentLocation: 'Bengaluru',
          preferredLocations: ['Bengaluru'],
          preferredWorkModes: ['FULL_TIME'],
        },
      }),
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingDetails: expect.objectContaining({
            interestDomain: 'CS_IT',
            githubUrl: 'https://github.com/ada',
            linkedinUrl: 'https://www.linkedin.com/in/ada',
          }),
        }),
      }),
    );
  });

  it('does not create SkillClaims on minimal completion', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(user.id, minimalCompletion());

    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('does not create SkillClaims when optional skills are supplied', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(
      user.id,
      minimalCompletion({
        skills: [
          { type: 'technical', name: 'Git & version control', proficiency: 'INTERMEDIATE' },
          { type: 'technical', name: 'Python', proficiency: 'ADVANCED' },
        ],
      }),
    );

    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('does not enroll TECH_FULLSTACK as a side effect of completion', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    const result = await service.completeOnboarding(user.id, minimalCompletion());

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          primaryTrackId: expect.anything(),
          secondaryTrackId: expect.anything(),
        }),
      }),
    );
    expect(result.primaryTrack).toBeNull();
  });

  it('enqueues candidate.skills_discovered only for skills the candidate kept selected', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(
      user.id,
      minimalCompletion({
        skillDiscovery: {
          suggestedFromGithub: [
            { language: 'TypeScript', bytes: 900, byteShare: 0.9, repoCount: 3 },
            { language: 'CSS', bytes: 100, byteShare: 0.1, repoCount: 1 },
          ],
          selectedSkillNames: ['TypeScript'],
          customSkillNames: [],
        },
      }),
    );

    expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    const call = outbox.enqueueEnvelope.mock.calls[0][0] as { data: { languages: unknown[] } };
    expect(call.data.languages).toEqual([
      { language: 'TypeScript', bytes: 900, byteShare: 0.9, repoCount: 3 },
    ]);
  });

  it('does not enqueue candidate.skills_discovered when no skills were selected', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(user.id, minimalCompletion());

    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });
});

describe('UsersService uploadProfilePhoto', () => {
  const auth = { revokeAllForUser: vi.fn() };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const storage = mockStorage();
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
    storage.upload.mockClear();
    storage.getSignedDownloadUrl.mockClear();
    service = new UsersService(prisma as never, auth as never, outbox as never, storage as never);
  });

  it('stores the uploaded photo and returns a signed profilePhotoUrl', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce(user);

    const result = await service.uploadProfilePhoto(user.id, {
      buffer: Buffer.from('fake-image'),
      fileName: 'avatar.png',
      mimeType: 'image/png',
    });

    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: `profile-photos/${user.id}`,
        fileName: 'avatar.png',
        contentType: 'image/png',
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { profilePhotoObjectKey: 'profile-photos/user-id/photo.jpg' },
    });
    expect(result.profilePhotoUrl).toBe('https://storage.example/profile-photos/user-id/photo.jpg');
  });

  it('rejects unsupported mime types', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);

    await expect(
      service.uploadProfilePhoto(user.id, {
        buffer: Buffer.from('fake'),
        fileName: 'avatar.gif',
        mimeType: 'image/gif',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UsersService saveOnboardingDraft', () => {
  const auth = { revokeAllForUser: vi.fn() };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const storage = mockStorage();
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
    service = new UsersService(prisma as never, auth as never, outbox as never, storage as never);
  });

  it('rejects an invalid draft payload', async () => {
    await expect(
      service.saveOnboardingDraft(randomUUID(), { firstName: 42 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('merges progressive profile fields after onboarding is complete', async () => {
    const user = studentRow({
      onboardingCompleted: true,
      onboardingDetails: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        dpdpConsent: true,
        dpdpConsentAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    prisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce(user);

    await service.saveOnboardingDraft(user.id, {
      about: 'Full-stack engineer focused on verification systems.',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
        data: {
          onboardingDetails: expect.objectContaining({
            about: 'Full-stack engineer focused on verification systems.',
          }),
        },
      }),
    );
  });

  it('merges partial fields into onboardingDetails without completing onboarding', async () => {
    const user = studentRow({ onboardingDetails: { firstName: 'Ada', linkedinUrl: '' } });
    prisma.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(user);
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
    expect(result.profilePhotoUrl).toBeNull();
  });
});

describe('UsersService changePassword', () => {
  const auth = { revokeAllForUser: vi.fn() };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const storage = mockStorage();
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let service: UsersService;

  beforeEach(() => {
    auth.revokeAllForUser.mockClear();
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new UsersService(prisma as never, auth as never, outbox as never, storage as never);
  });

  it('rejects SSO-only accounts without a password hash', async () => {
    const user = studentRow({ passwordHash: null, provider: 'GOOGLE' });
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.changePassword(user.id, {
        currentPassword: 'old-password1',
        newPassword: 'new-password2',
      }),
    ).rejects.toMatchObject({
      response: { error: 'password_not_available' },
    });
  });

  it('rejects an incorrect current password', async () => {
    const passwordHash = await hashPassword('correct-password');
    const user = studentRow({ passwordHash });
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.changePassword(user.id, {
        currentPassword: 'wrong-password',
        newPassword: 'new-password2',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('updates the hash and revokes refresh sessions', async () => {
    const passwordHash = await hashPassword('correct-password');
    const user = studentRow({ passwordHash });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);

    await service.changePassword(user.id, {
      currentPassword: 'correct-password',
      newPassword: 'new-password2',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
        data: expect.objectContaining({
          passwordHash: expect.not.stringMatching(passwordHash),
        }),
      }),
    );
    expect(auth.revokeAllForUser).toHaveBeenCalledWith(user.id);
  });
});
