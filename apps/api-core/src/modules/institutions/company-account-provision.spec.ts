import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashInviteToken } from '../invitations/invite-token.util.js';
import { provisionCompanyRepresentative } from './company-account-provision.js';

const COMPANY_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const ACTOR_ID = '66666666-6666-4666-8666-666666666666';
const USER_ID = '77777777-7777-4777-8777-777777777777';

describe('provisionCompanyRepresentative', () => {
  let tx: Record<string, unknown>;

  beforeEach(() => {
    tx = {
      companyOnboardingSession: {
        findFirst: vi.fn().mockResolvedValue({
          id: SESSION_ID,
          representativeEmail: 'hr@acme.example',
          representativeSnapshot: { fullName: 'Jane Rep' },
        }),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: USER_ID }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ passwordHash: null }),
      },
      invitation: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }: { data: { tokenHash: string } }) => ({
          id: 'inv-1',
          ...data,
        })),
        update: vi.fn(),
      },
    };
  });

  it('creates COMPANY user, links session, and returns activation email payload', async () => {
    const result = await provisionCompanyRepresentative(tx as never, {
      companyId: COMPANY_ID,
      companyName: 'Acme',
      invitedById: ACTOR_ID,
      onboardingSessionId: SESSION_ID,
    });

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'hr@acme.example',
          role: 'COMPANY',
          companyId: COMPANY_ID,
          emailVerified: true,
        }),
      }),
    );
    expect(tx.companyOnboardingSession.updateMany).toHaveBeenCalled();
    expect(result.activationEmail?.email).toBe('hr@acme.example');
    expect(result.activationEmail?.rawToken).toBeTruthy();
    const createdInvite = (tx.invitation.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
      .data as { tokenHash: string };
    expect(createdInvite.tokenHash).toBe(hashInviteToken(result.activationEmail?.rawToken ?? ''));
    expect(createdInvite.tokenHash).not.toBe(result.activationEmail?.rawToken);
  });

  it('reuses same-company user without creating duplicate', async () => {
    (tx.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      role: 'COMPANY',
      companyId: COMPANY_ID,
      passwordHash: null,
    });

    await provisionCompanyRepresentative(tx as never, {
      companyId: COMPANY_ID,
      companyName: 'Acme',
      invitedById: ACTOR_ID,
      onboardingSessionId: SESSION_ID,
    });

    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('rejects representative email tied to another company', async () => {
    (tx.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      role: 'COMPANY',
      companyId: '88888888-8888-4888-8888-888888888888',
    });

    await expect(
      provisionCompanyRepresentative(tx as never, {
        companyId: COMPANY_ID,
        companyName: 'Acme',
        invitedById: ACTOR_ID,
        onboardingSessionId: SESSION_ID,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects representative email registered as student', async () => {
    (tx.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      role: 'STUDENT',
      companyId: null,
    });

    await expect(
      provisionCompanyRepresentative(tx as never, {
        companyId: COMPANY_ID,
        companyName: 'Acme',
        invitedById: ACTOR_ID,
        onboardingSessionId: SESSION_ID,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('skips activation email when password already set', async () => {
    (tx.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      role: 'COMPANY',
      companyId: COMPANY_ID,
    });
    (tx.user.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      passwordHash: 'salt:hash',
    });

    const result = await provisionCompanyRepresentative(tx as never, {
      companyId: COMPANY_ID,
      companyName: 'Acme',
      invitedById: ACTOR_ID,
      onboardingSessionId: SESSION_ID,
    });

    expect(result.activationEmail).toBeNull();
    expect(tx.invitation.create).not.toHaveBeenCalled();
  });
});
