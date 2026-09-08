import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ASSESSABLE_TYPES,
  AssessableTypeSchema,
  PolymorphicAssessmentSessionDtoSchema,
  SHARED_VERIFICATION_STATUSES,
  SharedVerificationStatusSchema,
} from '../index.js';

describe('SE-T10 Polymorphic Assessment Session Contracts', () => {
  describe('AssessableTypeSchema', () => {
    it('accepts SKILL and CERTIFICATION assessable types', () => {
      expect(AssessableTypeSchema.parse('SKILL')).toBe('SKILL');
      expect(AssessableTypeSchema.parse('CERTIFICATION')).toBe('CERTIFICATION');
    });

    it('rejects unsupported assessable types', () => {
      expect(() => AssessableTypeSchema.parse('TRACK_LEVEL')).toThrow();
      expect(() => AssessableTypeSchema.parse('INVALID_TYPE')).toThrow();
    });

    it('exposes ASSESSABLE_TYPES constant', () => {
      expect(ASSESSABLE_TYPES).toEqual(['SKILL', 'CERTIFICATION']);
    });
  });

  describe('SharedVerificationStatusSchema', () => {
    it('accepts all 5 canonical shared verification status values', () => {
      for (const status of SHARED_VERIFICATION_STATUSES) {
        expect(SharedVerificationStatusSchema.parse(status)).toBe(status);
      }
    });

    it('rejects unknown status strings', () => {
      expect(() => SharedVerificationStatusSchema.parse('IN_PROGRESS')).toThrow();
      expect(() => SharedVerificationStatusSchema.parse('PENDING')).toThrow();
    });
  });

  describe('PolymorphicAssessmentSessionDtoSchema', () => {
    it('parses valid SKILL assessment session payload', () => {
      const sessionId = randomUUID();
      const claimId = randomUUID();

      const payload = {
        sessionId,
        assessableType: 'SKILL',
        assessableId: claimId,
        status: 'in_progress',
        serverRemainingSeconds: 1800,
        expiresAt: new Date().toISOString(),
      };

      const parsed = PolymorphicAssessmentSessionDtoSchema.parse(payload);
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.assessableType).toBe('SKILL');
      expect(parsed.assessableId).toBe(claimId);
      expect(parsed.status).toBe('in_progress');
      expect(parsed.serverRemainingSeconds).toBe(1800);
    });

    it('parses valid CERTIFICATION assessment session payload', () => {
      const sessionId = randomUUID();
      const certId = randomUUID();

      const payload = {
        sessionId,
        assessableType: 'CERTIFICATION',
        assessableId: certId,
        status: 'verified',
        retryAvailableAt: new Date().toISOString(),
        lockedUntil: null,
      };

      const parsed = PolymorphicAssessmentSessionDtoSchema.parse(payload);
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.assessableType).toBe('CERTIFICATION');
      expect(parsed.assessableId).toBe(certId);
      expect(parsed.status).toBe('verified');
    });

    it('rejects non-UUID assessableId or sessionId', () => {
      const invalidPayload = {
        sessionId: 'not-a-uuid',
        assessableType: 'SKILL',
        assessableId: 'not-a-uuid',
        status: 'unverified',
      };

      expect(() => PolymorphicAssessmentSessionDtoSchema.parse(invalidPayload)).toThrow();
    });
  });
});
