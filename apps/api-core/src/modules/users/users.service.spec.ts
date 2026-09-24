import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
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
  const auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
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
    auditPublisher.record.mockClear();
    service = new UsersService(
      prisma as never,
      auth as never,
      outbox as never,
      storage as never,
      auditPublisher as never,
    );
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

  it('stamps the current consent version and records a consent-accepted audit event on first completion', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(user.id, minimalCompletion());

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingDetails: expect.objectContaining({ consentVersion: 'v1' }),
        }),
      }),
    );
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: user.id,
        action: 'student.consent_accepted',
        resourceType: 'user',
        resourceId: user.id,
        metadata: expect.objectContaining({ consentVersion: 'v1', source: 'onboarding_complete' }),
      }),
    );
  });

  it('does not record a second consent-accepted audit event on retry (already-consented user)', async () => {
    const alreadyConsentedUser = studentRow({ dpdpConsentAt: new Date('2026-01-01T00:00:00Z') });
    prisma.user.findUnique.mockResolvedValueOnce(alreadyConsentedUser);
    mockCompletedUpdate(prisma, alreadyConsentedUser);

    await service.completeOnboarding(alreadyConsentedUser.id, minimalCompletion());

    expect(auditPublisher.record).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'student.consent_accepted' }),
    );
  });

  it('preserves the original consent timestamp when onboarding completion is retried', async () => {
    const originalConsentAt = new Date('2026-01-01T00:00:00Z');
    const alreadyConsentedUser = studentRow({ dpdpConsentAt: originalConsentAt });
    prisma.user.findUnique.mockResolvedValueOnce(alreadyConsentedUser);
    mockCompletedUpdate(prisma, alreadyConsentedUser);

    await service.completeOnboarding(alreadyConsentedUser.id, minimalCompletion());

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dpdpConsentAt: originalConsentAt }),
      }),
    );
  });

  it('persists study program + graduation year and records an audit event', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(
      user.id,
      minimalCompletion({
        academicProgram: { studyProgram: 'B.Tech CSE', graduationYear: 2026 },
      }),
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          graduationYear: 2026,
          onboardingDetails: expect.objectContaining({
            academicProgram: { studyProgram: 'B.Tech CSE', graduationYear: 2026 },
          }),
        }),
      }),
    );
    expect(auditPublisher.record).toHaveBeenCalledWith({
      actorId: user.id,
      action: 'student.academic_program_updated',
      resourceType: 'user',
      resourceId: user.id,
      reasonCode: null,
      metadata: {
        source: 'complete',
        previous: null,
        next: { studyProgram: 'B.Tech CSE', graduationYear: 2026 },
      },
    });
  });

  it('does not record an academic-program audit event when academicProgram is not submitted', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    mockCompletedUpdate(prisma, user);

    await service.completeOnboarding(user.id, minimalCompletion());

    expect(auditPublisher.record).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'student.academic_program_updated' }),
    );
  });

  it('rejects an empty studyProgram string', async () => {
    await expect(
      service.completeOnboarding(
        randomUUID(),
        minimalCompletion({ academicProgram: { studyProgram: '' } }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a graduationYear that is too far in the past', async () => {
    await expect(
      service.completeOnboarding(
        randomUUID(),
        minimalCompletion({ academicProgram: { graduationYear: 1800 } }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a graduationYear that is too far in the future', async () => {
    await expect(
      service.completeOnboarding(
        randomUUID(),
        minimalCompletion({ academicProgram: { graduationYear: 3050 } }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-integer graduationYear', async () => {
    await expect(
      service.completeOnboarding(
        randomUUID(),
        minimalCompletion({ academicProgram: { graduationYear: 2025.5 } }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is idempotent on repeated identical submissions', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValue(user);
    mockCompletedUpdate(prisma, user);
    const payload = minimalCompletion({
      academicProgram: { studyProgram: 'B.Tech CSE', graduationYear: 2026 },
    });

    const first = await service.completeOnboarding(user.id, payload);
    const second = await service.completeOnboarding(user.id, payload);

    expect(prisma.user.update).toHaveBeenCalledTimes(2);
    expect(first.onboardingCompleted).toBe(true);
    expect(second.onboardingCompleted).toBe(true);
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
    service = new UsersService(
      prisma as never,
      auth as never,
      outbox as never,
      storage as never,
      { record: vi.fn().mockResolvedValue(undefined) } as never,
    );
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

  it('accepts jpeg inferred from the file name when mime type is generic', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce(user);

    await service.uploadProfilePhoto(user.id, {
      buffer: Buffer.from('fake-image'),
      fileName: 'avatar.jpg',
      mimeType: 'application/octet-stream',
    });

    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'image/jpeg', fileName: 'avatar.jpg' }),
    );
  });

  it('returns storage_unavailable when object storage rejects the upload', async () => {
    const user = studentRow();
    prisma.user.findUnique.mockResolvedValueOnce(user);
    storage.upload.mockRejectedValueOnce(new Error('InvalidAccessKeyId'));

    await expect(
      service.uploadProfilePhoto(user.id, {
        buffer: Buffer.from('fake-image'),
        fileName: 'avatar.png',
        mimeType: 'image/png',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'storage_unavailable' }),
    });
  });
});

describe('UsersService saveOnboardingDraft', () => {
  const auth = { revokeAllForUser: vi.fn() };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const storage = mockStorage();
  const auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
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
    auditPublisher.record.mockClear();
    service = new UsersService(
      prisma as never,
      auth as never,
      outbox as never,
      storage as never,
      auditPublisher as never,
    );
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

  it('denormalizes graduationYear onto the User row and records an audit event', async () => {
    const user = studentRow({ onboardingDetails: { firstName: 'Ada' } });
    prisma.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce(user);

    await service.saveOnboardingDraft(user.id, {
      academicProgram: { graduationYear: 2027 },
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id },
        data: expect.objectContaining({ graduationYear: 2027 }),
      }),
    );
    expect(auditPublisher.record).toHaveBeenCalledWith({
      actorId: user.id,
      action: 'student.academic_program_updated',
      resourceType: 'user',
      resourceId: user.id,
      reasonCode: null,
      metadata: {
        source: 'draft',
        previous: null,
        next: { graduationYear: 2027 },
      },
    });
  });

  it('does not record an audit event on unrelated draft saves', async () => {
    const user = studentRow({ onboardingDetails: { firstName: 'Ada' } });
    prisma.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce(user);

    await service.saveOnboardingDraft(user.id, { githubUrl: 'https://github.com/ada' });

    expect(auditPublisher.record).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range graduationYear in the draft payload', async () => {
    await expect(
      service.saveOnboardingDraft(randomUUID(), {
        academicProgram: { graduationYear: 1800 },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists onboardingStep so a returning student resumes at the right wizard step (I212)', async () => {
    const user = studentRow({ onboardingDetails: { firstName: 'Ada' } });
    prisma.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce(user);

    const result = await service.saveOnboardingDraft(user.id, {
      onboardingStep: 'academics',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingDetails: expect.objectContaining({ onboardingStep: 'academics' }),
        }),
      }),
    );
    expect(result.draft?.onboardingStep).toBe('academics');
  });

  it('rejects an invalid onboardingStep value', async () => {
    await expect(
      service.saveOnboardingDraft(randomUUID(), { onboardingStep: 'not-a-real-step' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saves a study-program-only draft then completes with graduation year, merging both', async () => {
    const draftUser = studentRow({ onboardingDetails: {} });
    prisma.user.findUnique.mockResolvedValueOnce(draftUser).mockResolvedValueOnce(draftUser);
    prisma.user.update.mockResolvedValueOnce(draftUser);

    await service.saveOnboardingDraft(draftUser.id, {
      academicProgram: { studyProgram: 'B.Tech CSE' },
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingDetails: expect.objectContaining({
            academicProgram: { studyProgram: 'B.Tech CSE' },
          }),
        }),
      }),
    );
  });

  it('preserves previously-set studyProgram when a later draft only changes graduationYear (post-completion merge)', async () => {
    const user = studentRow({
      onboardingCompleted: true,
      onboardingDetails: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        dpdpConsent: true,
        academicProgram: { studyProgram: 'B.Tech CSE' },
      },
    });
    prisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValueOnce(user);

    await service.saveOnboardingDraft(user.id, {
      academicProgram: { graduationYear: 2026 },
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingDetails: expect.objectContaining({
            academicProgram: { studyProgram: 'B.Tech CSE', graduationYear: 2026 },
          }),
        }),
      }),
    );
  });
});
