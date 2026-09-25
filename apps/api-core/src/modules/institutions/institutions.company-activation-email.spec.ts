import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const noopRedis = { get: vi.fn(), setex: vi.fn(), del: vi.fn() };

const activationPayload = {
  invitationId: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  email: 'hr@acme.example',
  fullName: 'Jane Rep',
  companyName: 'Acme Corp',
  rawToken: 'raw-token-not-logged',
};

vi.mock('./company-verification-review.js', () => ({
  resolveCompanyVerification: vi.fn(),
}));

import { resolveCompanyVerification } from './company-verification-review.js';

describe('InstitutionsService company activation email', () => {
  it('enqueues activation email only after successful company approval', async () => {
    vi.mocked(resolveCompanyVerification).mockResolvedValue({
      queueItem: {
        tenantType: 'company',
        tenantId: '33333333-3333-4333-8333-333333333333',
        name: 'Acme',
        domain: 'acme',
        verificationStatus: 'APPROVED',
        verificationReason: 'ok',
        createdAt: new Date().toISOString(),
      },
      activationEmail: activationPayload,
      resubmissionEmail: null,
    });

    const enqueueCompanyActivationEmail = vi.fn().mockResolvedValue(undefined);
    const service = new InstitutionsService(
      {} as never,
      { enqueueCompanyActivationEmail } as never,
      {} as never,
      noopRedis as never,
      {} as never,
    );

    await service.resolveVerification(
      '33333333-3333-4333-8333-333333333333',
      {
        tenantType: 'company',
        decision: 'APPROVED',
        reason: 'Verified.',
      },
      '44444444-4444-4444-8444-444444444444',
    );

    expect(enqueueCompanyActivationEmail).toHaveBeenCalledWith(activationPayload);
  });

  it('does not enqueue activation email when approval returns no payload', async () => {
    vi.mocked(resolveCompanyVerification).mockResolvedValue({
      queueItem: {
        tenantType: 'company',
        tenantId: '33333333-3333-4333-8333-333333333333',
        name: 'Acme',
        domain: 'acme',
        verificationStatus: 'APPROVED',
        verificationReason: 'ok',
        createdAt: new Date().toISOString(),
      },
      activationEmail: null,
      resubmissionEmail: null,
    });

    const enqueueCompanyActivationEmail = vi.fn();
    const service = new InstitutionsService(
      {} as never,
      { enqueueCompanyActivationEmail } as never,
      {} as never,
      noopRedis as never,
      {} as never,
    );

    await service.resolveVerification(
      '33333333-3333-4333-8333-333333333333',
      {
        tenantType: 'company',
        decision: 'APPROVED',
        reason: 'Verified.',
      },
      '44444444-4444-4444-8444-444444444444',
    );

    expect(enqueueCompanyActivationEmail).not.toHaveBeenCalled();
  });

  it('does not enqueue activation email on rejection', async () => {
    vi.mocked(resolveCompanyVerification).mockResolvedValue({
      queueItem: {
        tenantType: 'company',
        tenantId: '33333333-3333-4333-8333-333333333333',
        name: 'Acme',
        domain: 'acme',
        verificationStatus: 'REJECTED',
        verificationReason: 'no',
        createdAt: new Date().toISOString(),
      },
      activationEmail: null,
      resubmissionEmail: null,
    });

    const enqueueCompanyActivationEmail = vi.fn();
    const service = new InstitutionsService(
      {} as never,
      { enqueueCompanyActivationEmail } as never,
      {} as never,
      noopRedis as never,
      {} as never,
    );

    await service.resolveVerification(
      '33333333-3333-4333-8333-333333333333',
      {
        tenantType: 'company',
        decision: 'REJECTED',
        reason: 'Rejected.',
      },
      '44444444-4444-4444-8444-444444444444',
    );

    expect(enqueueCompanyActivationEmail).not.toHaveBeenCalled();
  });
  it('emails the applicant what to change when a company is rejected', async () => {
    const expiresAt = new Date('2026-10-01T00:00:00.000Z');
    vi.mocked(resolveCompanyVerification).mockResolvedValue({
      queueItem: {
        tenantType: 'company',
        tenantId: '33333333-3333-4333-8333-333333333333',
        name: 'Acme',
        domain: 'acme',
        verificationStatus: 'REJECTED',
        verificationReason: 'Need a clearer GST certificate.',
        createdAt: new Date().toISOString(),
      },
      activationEmail: null,
      resubmissionEmail: {
        to: 'hr@acme.example',
        fullName: 'Jane Rep',
        companyName: 'Acme Corp',
        reason: 'Need a clearer GST certificate.',
        rejectedDocuments: [
          { fileName: 'gst.pdf', documentType: 'TAX_DOCUMENT', reason: 'Blurry scan.' },
        ],
        resumeUrl: 'http://localhost:3005/company/register?session=abc',
        expiresAt,
      },
    });

    const enqueueCompanyActivationEmail = vi.fn();
    const emailQueue = { add: vi.fn().mockResolvedValue(undefined) };
    const service = new InstitutionsService(
      {} as never,
      { enqueueCompanyActivationEmail } as never,
      {} as never,
      noopRedis as never,
      {} as never,
      emailQueue as never,
    );

    await service.resolveVerification(
      '33333333-3333-4333-8333-333333333333',
      { tenantType: 'company', decision: 'REJECTED', reason: 'Need a clearer GST certificate.' },
      '44444444-4444-4444-8444-444444444444',
    );

    expect(enqueueCompanyActivationEmail).not.toHaveBeenCalled();
    expect(emailQueue.add).toHaveBeenCalledWith('send', {
      to: 'hr@acme.example',
      template: 'company-verification-resubmit',
      data: {
        fullName: 'Jane Rep',
        companyName: 'Acme Corp',
        reason: 'Need a clearer GST certificate.',
        rejectedDocuments: [{ label: 'Tax document (gst.pdf)', reason: 'Blurry scan.' }],
        resumeUrl: 'http://localhost:3005/company/register?session=abc',
        expiresAtFormatted: expiresAt.toUTCString(),
      },
    });
  });
});
