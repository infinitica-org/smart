import { describe, expect, it } from 'vitest';
import { InvitationSentEventSchema, SMART_TOPICS } from '@smart/contracts';

describe('InvitationSentEventSchema', () => {
  it('accepts company-portal-invite activation payloads', () => {
    const parsed = InvitationSentEventSchema.safeParse({
      meta: {
        eventId: '11111111-1111-4111-8111-111111111111',
        eventType: SMART_TOPICS.invitationSent,
        version: 1,
        occurredAt: '2026-09-21T12:00:00.000Z',
        traceId: '22222222-2222-4222-8222-222222222222',
        source: 'invitations',
      },
      data: {
        invitationId: '33333333-3333-4333-8333-333333333333',
        userId: '44444444-4444-4444-8444-444444444444',
        email: 'hr@acme.example',
        fullName: 'Jane Rep',
        institutionName: 'Acme Corp',
        inviteUrl: 'http://localhost:3005/invite/sample-token',
        template: 'company-portal-invite',
        batchName: null,
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects unknown invitation email templates', () => {
    const parsed = InvitationSentEventSchema.safeParse({
      meta: {
        eventId: '11111111-1111-4111-8111-111111111111',
        eventType: SMART_TOPICS.invitationSent,
        version: 1,
        occurredAt: '2026-09-21T12:00:00.000Z',
        traceId: '22222222-2222-4222-8222-222222222222',
        source: 'invitations',
      },
      data: {
        invitationId: '33333333-3333-4333-8333-333333333333',
        userId: '44444444-4444-4444-8444-444444444444',
        email: 'hr@acme.example',
        fullName: 'Jane Rep',
        institutionName: 'Acme Corp',
        inviteUrl: 'http://localhost:3005/invite/sample-token',
        template: 'company-onboarding-email-verify',
        batchName: null,
      },
    });

    expect(parsed.success).toBe(false);
  });
});
