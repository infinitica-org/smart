import type { AuthenticatedUser } from '@smart/contracts';
import type { StorageService } from '../../platform/storage/storage.service.js';
import { toAuthenticatedUser } from '../auth/auth.service.js';

type UserWithProfilePhoto = Parameters<typeof toAuthenticatedUser>[0] & {
  profilePhotoObjectKey?: string | null;
};

export async function resolveProfilePhotoUrl(
  storage: StorageService,
  objectKey: string | null | undefined,
): Promise<string | null> {
  if (!objectKey) return null;
  try {
    return await storage.getSignedDownloadUrl(objectKey);
  } catch {
    return null;
  }
}

export async function toAuthenticatedUserWithPhoto(
  storage: StorageService,
  user: UserWithProfilePhoto,
): Promise<AuthenticatedUser> {
  const base = toAuthenticatedUser(user);
  return {
    ...base,
    profilePhotoUrl: await resolveProfilePhotoUrl(storage, user.profilePhotoObjectKey),
  };
}
