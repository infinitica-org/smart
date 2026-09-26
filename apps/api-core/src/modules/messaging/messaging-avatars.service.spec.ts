import { ListConversationsQuerySchema } from '@smart/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { ContactRulesService } from './contact-rules.service.js';
import { MessagingService } from './messaging.service.js';

const ME = '11111111-1111-4111-8111-111111111111';
const THEM = '22222222-2222-4222-8222-222222222222';
const CONV = '33333333-3333-4333-8333-333333333333';

/** Th6-424 — the other participant's avatar in GET /conversations. */
function build(
  counterpart: { role: 'STUDENT' | 'EMPLOYER' | 'ADVISOR'; user: Record<string, unknown> },
  storage?: { getSignedDownloadUrl: (key: string) => Promise<string> },
) {
  const now = new Date('2026-09-25T10:00:00Z');
  const prisma = {
    conversationParticipant: {
      findMany: vi.fn(async ({ where }: any) =>
        where.userId === ME
          ? [{ conversationId: CONV, mutedAt: null, leftAt: null }]
          : [
              {
                conversationId: CONV,
                role: counterpart.role,
                user: { id: THEM, ...counterpart.user },
              },
            ],
      ),
    },
    conversation: { findMany: vi.fn(async () => [{ id: CONV, lastMessageAt: now }]) },
    message: { findMany: vi.fn(async () => []) },
    block: { findMany: vi.fn(async () => []) },
    $queryRaw: vi.fn(async () => []),
  };
  const service = new MessagingService(prisma as any, {} as ContactRulesService, storage as any);
  return { prisma, service };
}

const list = (service: MessagingService) =>
  service.listConversations(ME, ListConversationsQuerySchema.parse({}));

describe('MessagingService avatars (Th6-424)', () => {
  const storage = { getSignedDownloadUrl: vi.fn(async (key: string) => `https://cdn/${key}`) };

  it("shows a student's photo", async () => {
    const { service } = build(
      {
        role: 'STUDENT',
        user: {
          fullName: 'Sam',
          profilePhotoObjectKey: 'profile-photos/sam.jpg',
          company: null,
          institution: null,
        },
      },
      storage,
    );
    const { conversations } = await list(service);
    expect(conversations[0]?.counterpart.avatarUrl).toBe('https://cdn/profile-photos/sam.jpg');
  });

  it("shows an employer's company logo, not their personal photo", async () => {
    const { service } = build(
      {
        role: 'EMPLOYER',
        user: {
          fullName: 'Erin',
          profilePhotoObjectKey: 'profile-photos/erin.jpg',
          company: { name: 'Acme', profile: { logoFileId: 'company-logos/acme/logo.png' } },
          institution: null,
        },
      },
      storage,
    );
    const { conversations } = await list(service);
    expect(conversations[0]?.counterpart.avatarUrl).toBe('https://cdn/company-logos/acme/logo.png');
    expect(conversations[0]?.counterpart.orgName).toBe('Acme');
  });

  it('returns null (initials) when there is no image, no storage, or signing fails', async () => {
    const noImage = build(
      {
        role: 'STUDENT',
        user: { fullName: 'Sam', profilePhotoObjectKey: null, company: null, institution: null },
      },
      storage,
    );
    expect((await list(noImage.service)).conversations[0]?.counterpart.avatarUrl).toBeNull();

    const noStorage = build({
      role: 'STUDENT',
      user: { fullName: 'Sam', profilePhotoObjectKey: 'k', company: null, institution: null },
    });
    expect((await list(noStorage.service)).conversations[0]?.counterpart.avatarUrl).toBeNull();

    const failing = build(
      {
        role: 'STUDENT',
        user: { fullName: 'Sam', profilePhotoObjectKey: 'k', company: null, institution: null },
      },
      { getSignedDownloadUrl: async () => Promise.reject(new Error('storage down')) },
    );
    expect((await list(failing.service)).conversations[0]?.counterpart.avatarUrl).toBeNull();
  });
});
