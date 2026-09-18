import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  buildCertificationPolymorphicSession,
  buildSkillPolymorphicSession,
  mapCandidateCertificateToSharedVerificationStatus,
  mapSkillClaimToSharedVerificationStatus,
} from './polymorphic-assessment-session.mapper.js';
import { SkillVerificationService } from './skill-verification.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const CLAIM_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';

function student(): RequestUser {
  return { sub: STUDENT_ID, role: 'STUDENT', inst: null };
}

describe('SE-T10 Polymorphic Assessment Session Adapter & Integration', () => {
  describe('Status Mappers', () => {
    it('maps SkillClaim status to SharedVerificationStatus correctly', () => {
      expect(mapSkillClaimToSharedVerificationStatus('DECLARED')).toBe('unverified');
      expect(mapSkillClaimToSharedVerificationStatus('BEGINNER_REATTEMPT')).toBe('unverified');
      expect(mapSkillClaimToSharedVerificationStatus('DECLARED', true)).toBe('in_progress');
      expect(mapSkillClaimToSharedVerificationStatus('VERIFIED')).toBe('verified');
      expect(mapSkillClaimToSharedVerificationStatus('LOCKED')).toBe('rejected');
      expect(mapSkillClaimToSharedVerificationStatus('DECLARED', false, true)).toBe('voided');
    });

    it('maps CandidateCertificate status to SharedVerificationStatus correctly', () => {
      expect(mapCandidateCertificateToSharedVerificationStatus('DECLARED')).toBe('unverified');
      expect(mapCandidateCertificateToSharedVerificationStatus('UPLOADED')).toBe('unverified');
      expect(mapCandidateCertificateToSharedVerificationStatus('IN_VERIFICATION')).toBe(
        'in_progress',
      );
      expect(mapCandidateCertificateToSharedVerificationStatus('UPLOADED', true)).toBe(
        'in_progress',
      );
      expect(mapCandidateCertificateToSharedVerificationStatus('VERIFIED')).toBe('verified');
      expect(mapCandidateCertificateToSharedVerificationStatus('REJECTED')).toBe('rejected');
    });
  });

  describe('Polymorphic Builders', () => {
    it('builds a valid SKILL polymorphic session DTO', () => {
      const sessionId = randomUUID();
      const claimId = randomUUID();
      const expiresAt = new Date(Date.now() + 1800 * 1000).toISOString();

      const session = buildSkillPolymorphicSession({
        sessionId,
        claimId,
        status: 'DECLARED',
        hasActiveSession: true,
        expiresAt,
        serverRemainingSeconds: 1800,
      });

      expect(session.sessionId).toBe(sessionId);
      expect(session.assessableType).toBe('SKILL');
      expect(session.assessableId).toBe(claimId);
      expect(session.status).toBe('in_progress');
      expect(session.serverRemainingSeconds).toBe(1800);
    });

    it('builds a valid CERTIFICATION polymorphic session DTO', () => {
      const sessionId = randomUUID();
      const certId = randomUUID();

      const session = buildCertificationPolymorphicSession({
        sessionId,
        certificateId: certId,
        status: 'VERIFIED',
      });

      expect(session.sessionId).toBe(sessionId);
      expect(session.assessableType).toBe('CERTIFICATION');
      expect(session.assessableId).toBe(certId);
      expect(session.status).toBe('verified');
    });
  });

  describe('SkillVerificationService Integration', () => {
    it('returns a valid PolymorphicAssessmentSessionDto for an active skill verification session', async () => {
      const stored = {
        sessionId: SESSION_ID,
        userId: STUDENT_ID,
        claimId: CLAIM_ID,
        catalogSkillCode: 'SQL_QUERY_OPTIMIZATION',
        skillName: 'Git',
        sdeSkillCode: 'SDE_GIT',
        proficiency: 'BEGINNER',
        skillFocus: null,
        scoringToken: 'token',
        items: [],
        timeMinutes: 20,
        passMarkPercent: 80,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        answers: [],
      };

      const claim = {
        id: CLAIM_ID,
        studentId: STUDENT_ID,
        proficiency: 'BEGINNER',
        status: 'DECLARED',
        strikes: 0,
        lockedUntil: null,
        verifiedUntil: null,
        lastAttemptId: null,
        skill: { code: 'SQL_QUERY_OPTIMIZATION', name: 'Git' },
      };

      const redis = {
        get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      };
      const prisma = {
        skillClaim: {
          findUnique: vi.fn().mockResolvedValue(claim),
        },
        skillVerificationAttempt: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };

      const service = new SkillVerificationService(
        prisma as never,
        redis as never,
        {} as never,
        { enqueueEnvelope: vi.fn() } as never,
        { resolveBlueprint: vi.fn(), buildAssessmentResult: vi.fn() } as never,
        { evaluateClaimVerification: vi.fn() } as never,
        {
          assertCompleteForSkillVerification: vi.fn().mockResolvedValue(undefined),
          isCompleteForSkillVerification: vi.fn().mockResolvedValue(true),
          getProgressForStudent: vi.fn().mockResolvedValue({ percent: 100 }),
        } as never,
      );

      const polymorphicSession = await service.getPolymorphicSession(student(), SESSION_ID);

      expect(polymorphicSession.sessionId).toBe(SESSION_ID);
      expect(polymorphicSession.assessableType).toBe('SKILL');
      expect(polymorphicSession.assessableId).toBe(CLAIM_ID);
      expect(polymorphicSession.status).toBe('in_progress');
      expect(polymorphicSession.serverRemainingSeconds).toBeGreaterThan(0);
    });
  });
});
