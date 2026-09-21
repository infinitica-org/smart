import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillClaimAutoDeclareService } from './skill-claim-auto-declare.service.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const SKILL_ID = '77777777-7777-4777-8777-777777777777';

describe('SkillClaimAutoDeclareService', () => {
  const findUniqueSkill = vi.fn();
  const createSkill = vi.fn();
  const findUniqueClaim = vi.fn();
  const createClaim = vi.fn();
  const updateClaim = vi.fn();
  let service: SkillClaimAutoDeclareService;

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
    };
    service = new SkillClaimAutoDeclareService(prisma as never);
  });

  it('creates a DECLARED claim when tagging a catalog skill on a project', async () => {
    findUniqueSkill.mockResolvedValue({
      id: SKILL_ID,
      code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    });
    findUniqueClaim.mockResolvedValue(null);
    createClaim.mockResolvedValue({ id: 'claim-1' });

    await service.ensureClaimsForProjectTags(STUDENT_ID, PROJECT_ID, [
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    ]);

    expect(createClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: STUDENT_ID,
          skillId: SKILL_ID,
          proficiency: 'BEGINNER',
          status: 'DECLARED',
          sourceMetadata: expect.objectContaining({
            declareOrigin: 'PROJECT_TAGGED',
            projectIds: [PROJECT_ID],
          }),
        }),
      }),
    );
  });

  it('does not create a claim for unknown skill codes', async () => {
    await service.ensureClaimsForProjectTags(STUDENT_ID, PROJECT_ID, ['NOT_A_REAL_SKILL']);
    expect(createClaim).not.toHaveBeenCalled();
  });

  it('merges project id into metadata when claim already DECLARED', async () => {
    findUniqueSkill.mockResolvedValue({
      id: SKILL_ID,
      code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    });
    findUniqueClaim.mockResolvedValue({
      id: 'claim-1',
      status: 'DECLARED',
      sourceMetadata: { declareOrigin: 'PROJECT_TAGGED', projectIds: ['other-proj'] },
    });
    updateClaim.mockResolvedValue({});

    await service.ensureClaimsForProjectTags(STUDENT_ID, PROJECT_ID, [
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    ]);

    expect(updateClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceMetadata: expect.objectContaining({
            projectIds: expect.arrayContaining(['other-proj', PROJECT_ID]),
          }),
        }),
      }),
    );
    expect(createClaim).not.toHaveBeenCalled();
  });
});
