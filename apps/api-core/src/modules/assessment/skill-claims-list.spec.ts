import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AssessmentService } from './assessment.service.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_STUDENT_ID = '22222222-2222-4222-8222-222222222222';
const INST_ID = '33333333-3333-4333-8333-333333333333';
const CLAIM_ID = '44444444-4444-4444-8444-444444444444';

function studentUser(sub = STUDENT_ID): RequestUser {
  return { sub, role: 'STUDENT', inst: INST_ID };
}

describe('listSkillClaims', () => {
  const findMany = vi.fn();
  let service: AssessmentService;

  beforeEach(() => {
    findMany.mockReset();
    const prisma = { skillClaim: { findMany } };
    service = new AssessmentService(prisma as never, {} as never, {} as never);
  });

  it('scopes STUDENT reads to JWT sub only', async () => {
    findMany.mockResolvedValue([]);
    await service.listSkillClaims(studentUser());
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: STUDENT_ID },
      }),
    );
    expect(findMany.mock.calls[0][0].where).not.toHaveProperty('institutionId');
  });

  it('never returns another student id for a student caller', async () => {
    findMany.mockResolvedValue([
      {
        id: CLAIM_ID,
        studentId: STUDENT_ID,
        proficiency: 'BEGINNER',
        status: 'DECLARED',
        strikes: 0,
        lockedUntil: null,
        lastAttemptId: null,
        skill: { code: 'sql' },
      },
    ]);
    const rows = await service.listSkillClaims(studentUser());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.studentId).toBe(STUDENT_ID);
    expect(rows[0]?.studentId).not.toBe(OTHER_STUDENT_ID);
    expect(rows[0]).not.toHaveProperty('institutionId');
  });

  it('scopes TPO reads to JWT institution, not a client payload', async () => {
    findMany.mockResolvedValue([]);
    await service.listSkillClaims({
      sub: '55555555-5555-4555-8555-555555555555',
      role: 'PLACEMENT_STAFF',
      inst: INST_ID,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { student: { institutionId: INST_ID, role: 'STUDENT' } },
      }),
    );
  });

  it('rejects TPO callers without JWT inst', async () => {
    await expect(
      service.listSkillClaims({
        sub: '66666666-6666-4666-8666-666666666666',
        role: 'INSTITUTION_ADMIN',
        inst: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
