import { describe, expect, it } from 'vitest';
import {
  CreatePartnershipRequestSchema,
  ListPartnershipRequestsQuerySchema,
  ReviewPartnershipRequestSchema,
} from './partnership.dto.js';

describe('Partnership DTO Schemas', () => {
  it('validates a valid CreatePartnershipRequest', () => {
    const valid = {
      name: 'Stanford University',
      domain: 'stanford.edu',
      contactName: 'Jane Doe',
      contactEmail: 'jane.doe@stanford.edu',
      contactPhone: '+1 650 723 2300',
      estimatedStudents: 15000,
      notes: 'Interested in SMART placement partnership.',
    };

    const parsed = CreatePartnershipRequestSchema.parse(valid);
    expect(parsed.name).toBe('Stanford University');
    expect(parsed.domain).toBe('stanford.edu');
    expect(parsed.contactEmail).toBe('jane.doe@stanford.edu');
  });

  it('rejects invalid email and invalid domain', () => {
    expect(() =>
      CreatePartnershipRequestSchema.parse({
        name: 'Invalid School',
        domain: 'not a valid domain!!',
        contactName: 'Bob',
        contactEmail: 'invalid-email',
      }),
    ).toThrow();
  });

  it('validates ListPartnershipRequestsQuery defaults', () => {
    const parsed = ListPartnershipRequestsQuerySchema.parse({});
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(0);
    expect(parsed.status).toBeUndefined();
  });

  it('validates ReviewPartnershipRequest decision', () => {
    const parsed = ReviewPartnershipRequestSchema.parse({
      decision: 'APPROVED',
      reviewNotes: 'Verified accreditation and domain details.',
    });
    expect(parsed.decision).toBe('APPROVED');

    expect(() =>
      ReviewPartnershipRequestSchema.parse({
        decision: 'INVALID_DECISION',
      }),
    ).toThrow();
  });
});
