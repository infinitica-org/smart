import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectReviewService } from './project-review.service.js';

const projectId = randomUUID();
const studentId = randomUUID();

describe('ProjectReviewService', () => {
  const records = {
    load: vi.fn(),
    appendAppeal: vi.fn(),
    appendResolution: vi.fn(),
  };
  const prisma = {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectVerificationReport: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => {
      for (const op of ops) await op;
    }),
  };

  const service = new ProjectReviewService(prisma as never, records as never);

  beforeEach(() => vi.clearAllMocks());

  it('rejects appeal when project is verified', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: projectId,
      studentId,
      status: 'VERIFIED',
    });
    await expect(
      service.submitAppeal(projectId, studentId, { reason: 'Score does not match my answers.' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
