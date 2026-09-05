import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { SkillVerificationService } from './skill-verification.service.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const CLAIM_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';

function student(): RequestUser {
  return { sub: STUDENT_ID, role: 'STUDENT', inst: null };
}

function declaredClaim() {
  return {
    id: CLAIM_ID,
    studentId: STUDENT_ID,
    proficiency: 'BEGINNER',
    status: 'DECLARED',
    strikes: 0,
    lockedUntil: null,
    verifiedUntil: null,
    lastAttemptId: null,
    skill: { code: 'GIT_VERSION_CONTROL', name: 'Git' },
  };
}

describe('SkillVerificationService', () => {
  it('prepareOnly skips LLM generate after the claim/cooldown gate', async () => {
    const evaluation = { generateSkillForm: vi.fn() };
    const redis = { setex: vi.fn().mockResolvedValue('OK') };
    const prisma = {
      skillClaim: { findUnique: vi.fn().mockResolvedValue(declaredClaim()) },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new SkillVerificationService(
      prisma as never,
      redis as never,
      evaluation as never,
      { enqueueEnvelope: vi.fn() } as never,
    );

    const prepared = await service.start(student(), CLAIM_ID, { prepareOnly: true });
    expect('items' in prepared).toBe(false);
    expect(evaluation.generateSkillForm).not.toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalled();
  });

  it('blocks prepare when the 48h inter-attempt cooldown is still open', async () => {
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue({ ...declaredClaim(), status: 'BEGINNER_REATTEMPT' }),
      },
      skillVerificationAttempt: {
        findFirst: vi.fn().mockResolvedValue({ createdAt: new Date() }),
      },
    };
    const service = new SkillVerificationService(
      prisma as never,
      {} as never,
      {} as never,
      {
        enqueueEnvelope: vi.fn(),
      } as never,
    );

    await expect(service.start(student(), CLAIM_ID, { prepareOnly: true })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects catalog skills that are not on the SDE v4 bridge', async () => {
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue({
          ...declaredClaim(),
          skill: { code: 'UNKNOWN_SKILL_CODE', name: 'Nope' },
        }),
      },
    };
    const service = new SkillVerificationService(
      prisma as never,
      {} as never,
      {} as never,
      {
        enqueueEnvelope: vi.fn(),
      } as never,
    );

    await expect(service.start(student(), CLAIM_ID)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('settles with evaluation.passed and does not require an interview flag', async () => {
    const form = {
      scoringToken: 'x'.repeat(24),
      items: [
        { index: 1, format: 'MCQ', prompt: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' } },
      ],
      timeMinutes: 20,
      passMarkPercent: 80,
    };
    const evaluation = {
      generateSkillForm: vi.fn().mockResolvedValue(form),
      gradeSkillForm: vi.fn().mockResolvedValue({
        skillCode: 'SDE_GIT',
        proficiency: 'BEGINNER',
        marksEarned: 12,
        marksTotal: 12,
        scorePercent: 100,
        passed: true,
        promptRef: 'sde-skill-open-batch-grader@1',
      }),
    };
    const stored = {
      sessionId: SESSION_ID,
      userId: STUDENT_ID,
      claimId: CLAIM_ID,
      catalogSkillCode: 'GIT_VERSION_CONTROL',
      skillName: 'Git',
      sdeSkillCode: 'SDE_GIT',
      proficiency: 'BEGINNER',
      scoringToken: form.scoringToken,
      items: form.items,
      timeMinutes: 20,
      passMarkPercent: 80,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      answers: [{ index: 1, selectedKey: 'A' }],
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      del: vi.fn().mockResolvedValue(1),
      setex: vi.fn().mockResolvedValue('OK'),
    };
    const updated = {
      ...declaredClaim(),
      status: 'VERIFIED',
      lastAttemptId: SESSION_ID,
    };
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue(declaredClaim()),
        update: vi.fn(),
      },
      skillVerificationAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([updated]),
    };
    const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
    const service = new SkillVerificationService(
      prisma as never,
      redis as never,
      evaluation as never,
      outbox as never,
    );

    const result = await service.complete(student(), SESSION_ID, { responses: stored.answers });

    expect(evaluation.gradeSkillForm).toHaveBeenCalled();
    expect(result.claim.status).toBe('VERIFIED');
    expect(result.grade?.passed).toBe(true);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'smart.skill.verification.completed',
        data: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    );
  });

  it('blocks start when the claim is already verified', async () => {
    const prisma = {
      skillClaim: {
        findUnique: vi.fn().mockResolvedValue({ ...declaredClaim(), status: 'VERIFIED' }),
      },
      skillVerificationAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new SkillVerificationService(
      prisma as never,
      {} as never,
      {} as never,
      {
        enqueueEnvelope: vi.fn(),
      } as never,
    );

    await expect(service.start(student(), CLAIM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
