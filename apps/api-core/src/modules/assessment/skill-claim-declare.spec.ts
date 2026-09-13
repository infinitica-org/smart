import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AssessmentService } from './assessment.service.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const SKILL_ID = '77777777-7777-4777-8777-777777777777';
const CLAIM_ID = '44444444-4444-4444-8444-444444444444';

function studentUser(sub = STUDENT_ID): RequestUser {
  return { sub, role: 'STUDENT', inst: null };
}

describe('declareSkillClaim', () => {
  const findUniqueSkill = vi.fn();
  const createSkill = vi.fn();
  const findUniqueClaim = vi.fn();
  const createClaim = vi.fn();
  const updateClaim = vi.fn();
  let service: AssessmentService;

  beforeEach(() => {
    findUniqueSkill.mockReset();
    createSkill.mockReset();
    findUniqueClaim.mockReset();
    createClaim.mockReset();
    updateClaim.mockReset();
    const prisma = {
      skill: { findUnique: findUniqueSkill, create: createSkill },
      skillClaim: {
        findUnique: findUniqueClaim,
        create: createClaim,
        update: updateClaim,
      },
      skillVerificationAttempt: { findMany: vi.fn().mockResolvedValue([]) },
    };
    service = new AssessmentService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('creates a SkillClaim at DECLARED for a new INF-05 skill', async () => {
    findUniqueSkill.mockResolvedValue({
      id: SKILL_ID,
      code: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    });
    findUniqueClaim.mockResolvedValue(null);
    createClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      proficiency: 'BEGINNER',
      status: 'DECLARED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
      skill: { code: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION' },
    });

    const row = await service.declareSkillClaim(studentUser(), {
      skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
      proficiency: 'BEGINNER',
    });

    expect(createClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: STUDENT_ID,
          skillId: SKILL_ID,
          proficiency: 'BEGINNER',
          status: 'DECLARED',
        }),
      }),
    );
    expect(row.status).toBe('DECLARED');
    expect(row.skillCode).toBe('ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION');
  });

  it('rejects unknown skill codes', async () => {
    await expect(
      service.declareSkillClaim(studentUser(), {
        skillCode: 'NOT_A_REAL_SKILL',
        proficiency: 'BEGINNER',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createClaim).not.toHaveBeenCalled();
  });

  it('blocks re-declare while LOCKED cooldown is active', async () => {
    const lockedUntil = new Date(Date.now() + 86_400_000);
    findUniqueSkill.mockResolvedValue({ id: SKILL_ID, code: 'SQL_QUERY_OPTIMIZATION' });
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'LOCKED',
      lockedUntil,
      proficiency: 'BEGINNER',
      strikes: 2,
      lastAttemptId: null,
      skill: { code: 'SQL_QUERY_OPTIMIZATION' },
    });

    await expect(
      service.declareSkillClaim(studentUser(), {
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        proficiency: 'INTERMEDIATE',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateClaim).not.toHaveBeenCalled();
  });

  it('re-declares to DECLARED after LOCKED cooldown expires', async () => {
    findUniqueSkill.mockResolvedValue({ id: SKILL_ID, code: 'SQL_QUERY_OPTIMIZATION' });
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'LOCKED',
      lockedUntil: new Date(Date.now() - 1_000),
      proficiency: 'BEGINNER',
      strikes: 2,
      lastAttemptId: null,
      skill: { code: 'SQL_QUERY_OPTIMIZATION' },
    });
    updateClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      proficiency: 'INTERMEDIATE',
      status: 'DECLARED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
      skill: { code: 'SQL_QUERY_OPTIMIZATION' },
    });

    const row = await service.declareSkillClaim(studentUser(), {
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      proficiency: 'INTERMEDIATE',
    });

    expect(updateClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proficiency: 'INTERMEDIATE',
          status: 'DECLARED',
          strikes: 0,
          lockedUntil: null,
        }),
      }),
    );
    expect(row.status).toBe('DECLARED');
  });

  it('updates proficiency and focus on an existing DECLARED claim', async () => {
    findUniqueSkill.mockResolvedValue({ id: SKILL_ID, code: 'SQL_QUERY_OPTIMIZATION' });
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'DECLARED',
      lockedUntil: null,
      proficiency: 'BEGINNER',
      strikes: 0,
      lastAttemptId: null,
      sourceMetadata: null,
      skill: { code: 'SQL_QUERY_OPTIMIZATION' },
    });
    updateClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      proficiency: 'ADVANCED',
      status: 'DECLARED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
      sourceMetadata: { skillFocus: 'Query tuning' },
      skill: { code: 'SQL_QUERY_OPTIMIZATION' },
    });

    const row = await service.declareSkillClaim(studentUser(), {
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      proficiency: 'ADVANCED',
      skillFocus: 'Query tuning',
    });

    expect(updateClaim).toHaveBeenCalled();
    expect(row.proficiency).toBe('ADVANCED');
    expect(row.skillFocus).toBe('Query tuning');
  });

  it('accepts professional proficiency on re-declare', async () => {
    findUniqueSkill.mockResolvedValue({ id: SKILL_ID, code: 'SQL_QUERY_OPTIMIZATION' });
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'DECLARED',
      lockedUntil: null,
      proficiency: 'INTERMEDIATE',
      strikes: 0,
      lastAttemptId: null,
      sourceMetadata: null,
      skill: { code: 'SQL_QUERY_OPTIMIZATION' },
    });
    updateClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      proficiency: 'PROFESSIONAL',
      status: 'DECLARED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
      sourceMetadata: null,
      skill: { code: 'SQL_QUERY_OPTIMIZATION' },
    });

    const row = await service.declareSkillClaim(studentUser(), {
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      proficiency: 'PROFESSIONAL',
    });

    expect(row.proficiency).toBe('PROFESSIONAL');
  });

  it('rejects declare when a verified claim already exists', async () => {
    findUniqueSkill.mockResolvedValue({ id: SKILL_ID, code: 'SQL_QUERY_OPTIMIZATION' });
    findUniqueClaim.mockResolvedValue({
      id: CLAIM_ID,
      studentId: STUDENT_ID,
      status: 'VERIFIED',
      lockedUntil: null,
      proficiency: 'BEGINNER',
      strikes: 0,
      lastAttemptId: null,
      skill: { code: 'SQL_QUERY_OPTIMIZATION' },
    });

    await expect(
      service.declareSkillClaim(studentUser(), {
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        proficiency: 'ADVANCED',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateClaim).not.toHaveBeenCalled();
  });

  it('rejects non-student callers', async () => {
    await expect(
      service.declareSkillClaim(
        { sub: STUDENT_ID, role: 'PLACEMENT_STAFF', inst: '33333333-3333-4333-8333-333333333333' },
        { skillCode: 'SQL_QUERY_OPTIMIZATION', proficiency: 'BEGINNER' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
