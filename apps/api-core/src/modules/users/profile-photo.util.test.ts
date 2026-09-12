import { describe, expect, it, vi } from 'vitest';
import { toAuthenticatedUser } from '../auth/auth.service.js';
import { resolveProfilePhotoUrl, toAuthenticatedUserWithPhoto } from './profile-photo.util.js';

describe('profile-photo.util', () => {
  const baseUser = {
    id: 'user-1',
    email: 'ada@example.com',
    fullName: 'Ada Lovelace',
    role: 'STUDENT' as const,
    provider: 'PASSWORD' as const,
    emailVerified: true,
    institutionId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    institution: null,
    primaryTrack: null,
    secondaryTrack: null,
    onboardingCompleted: true,
  };

  it('returns null when no object key is stored', async () => {
    const storage = { getSignedDownloadUrl: vi.fn() };
    await expect(resolveProfilePhotoUrl(storage as never, null)).resolves.toBeNull();
    expect(storage.getSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('resolves a signed profile photo URL', async () => {
    const storage = {
      getSignedDownloadUrl: vi.fn().mockResolvedValue('https://cdn.example/photo.jpg'),
    };
    await expect(
      resolveProfilePhotoUrl(storage as never, 'profile-photos/user-1/photo.jpg'),
    ).resolves.toBe('https://cdn.example/photo.jpg');
  });

  it('falls back to null when signed URL resolution fails', async () => {
    const storage = {
      getSignedDownloadUrl: vi.fn().mockRejectedValue(new Error('missing object')),
    };
    await expect(
      resolveProfilePhotoUrl(storage as never, 'profile-photos/user-1/photo.jpg'),
    ).resolves.toBeNull();
  });

  it('enriches AuthenticatedUser with profilePhotoUrl', async () => {
    const storage = {
      getSignedDownloadUrl: vi.fn().mockResolvedValue('https://cdn.example/photo.jpg'),
    };
    const result = await toAuthenticatedUserWithPhoto(storage as never, {
      ...baseUser,
      profilePhotoObjectKey: 'profile-photos/user-1/photo.jpg',
    });

    expect(result.profilePhotoUrl).toBe('https://cdn.example/photo.jpg');
    expect(toAuthenticatedUser({ ...baseUser, profilePhotoObjectKey: 'x' }).profilePhotoUrl).toBe(
      null,
    );
  });
});
