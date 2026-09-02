import { describe, expect, it, vi } from 'vitest';
import { PROJECT_VERIFY_PROMPT_REF } from '@smart/contracts';
import { ProjectVerifyService } from './project-verify.service.js';
import type { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';

const studentId = '123e4567-e89b-12d3-a456-426614174001';
const projectId = '123e4567-e89b-12d3-a456-426614174000';
const reportId = '123e4567-e89b-12d3-a456-426614174002';

const template = {
  title: 'Campus bus tracker',
  problem: 'Students cannot see live bus location on campus routes.',
  approach: 'I used websockets and a small GPS ingest service.',
  stack: 'TypeScript, Nest, Redis',
  outcome: 'Average wait time dropped in a 30-student pilot.',
};

function projectRow(status: 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' = 'SUBMITTED') {
  return {
    id: projectId,
    studentId,
    ...template,
    loomUrl: null,
    githubUrl: null,
    status,
    createdAt: new Date('2026-09-02T10:00:00.000Z'),
    report: null,
    student: { fullName: 'Ada Lovelace' },
  };
}

function prismaMock(
  overrides?: Partial<{
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  }>,
) {
  return {
    project: {
      create: overrides?.create ?? vi.fn(),
      findUnique: overrides?.findUnique ?? vi.fn(),
      findMany: overrides?.findMany ?? vi.fn().mockResolvedValue([]),
      update: overrides?.update ?? vi.fn(),
    },
    projectVerificationReport: {
      upsert: overrides?.upsert ?? vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

describe('ProjectVerifyService', () => {
  it('routes to human review when GitHub snapshot is missing and never sets REJECTED', async () => {
    const complete = vi.fn().mockResolvedValue({
      output: {
        relevanceScore: 80,
        qualityScore: 80,
        confidence: 0.95,
        explanation: 'Strong write-up but there is no repository evidence to inspect.',
        evidence: ['Named websockets'],
        gaps: ['No GitHub snapshot'],
      },
      auditId: null,
    });
    const updated = {
      ...projectRow('UNDER_REVIEW'),
      report: {
        id: reportId,
        projectId,
        score: 70,
        plagiarismFlag: false,
        techAgeFlag: false,
        relevanceScore: 80,
        explanation:
          'Strong write-up but there is no repository evidence to inspect.\n---smart-verify---\n' +
          JSON.stringify({
            qualityScore: 80,
            duplicateScore: 0,
            confidence: 0.4,
            flags: ['SNAPSHOT_UNAVAILABLE', 'LOW_CONFIDENCE'],
            promptRef: PROJECT_VERIFY_PROMPT_REF,
            auditId: null,
          }),
        routedToReview: true,
        createdAt: new Date('2026-09-02T10:00:01.000Z'),
      },
    };
    const prisma = prismaMock({
      findUnique: vi.fn().mockResolvedValue(projectRow()),
      update: vi.fn().mockResolvedValue(updated),
    });
    const service = new ProjectVerifyService(prisma, { complete } as unknown as AiGatewayService);

    const result = await service.verifyProject(projectId);

    expect(result.status).toBe('UNDER_REVIEW');
    expect(result.report?.routedToReview).toBe(true);
    expect(result.status).not.toBe('REJECTED');
    expect(complete.mock.calls[0]?.[0]).toMatchObject({
      promptRef: PROJECT_VERIFY_PROMPT_REF,
      priority: 'P2_ASYNC_EVAL',
    });
  });

  it('fails closed to review when the stubbed gateway throws', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('no providers'));
    const updated = {
      ...projectRow('UNDER_REVIEW'),
      report: {
        id: reportId,
        projectId,
        score: 20,
        plagiarismFlag: false,
        techAgeFlag: false,
        relevanceScore: 0,
        explanation:
          'Verification agent unavailable. Routed to human review instead of auto-rejecting.\n---smart-verify---\n' +
          JSON.stringify({
            qualityScore: 0,
            duplicateScore: 0,
            confidence: 0,
            flags: ['SNAPSHOT_UNAVAILABLE', 'LLM_UNAVAILABLE', 'LOW_CONFIDENCE'],
            promptRef: PROJECT_VERIFY_PROMPT_REF,
            auditId: null,
          }),
        routedToReview: true,
        createdAt: new Date('2026-09-02T10:00:01.000Z'),
      },
    };
    const prisma = prismaMock({
      findUnique: vi.fn().mockResolvedValue(projectRow()),
      update: vi.fn().mockResolvedValue(updated),
    });
    const service = new ProjectVerifyService(prisma, { complete } as unknown as AiGatewayService);

    const result = await service.verifyProject(projectId);
    expect(result.status).toBe('UNDER_REVIEW');
    expect(prisma.projectVerificationReport.upsert).toHaveBeenCalled();
  });

  it('lets a reviewer reject; the agent path is not used', async () => {
    const prisma = prismaMock({
      findUnique: vi.fn().mockResolvedValue({
        ...projectRow('UNDER_REVIEW'),
        report: {
          id: reportId,
          projectId,
          score: 40,
          plagiarismFlag: true,
          techAgeFlag: false,
          relevanceScore: 40,
          explanation: 'Likely duplicate.\n---smart-verify---\n{}',
          routedToReview: true,
          createdAt: new Date('2026-09-02T10:00:01.000Z'),
        },
      }),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...projectRow(data.status),
          student: { fullName: 'Ada Lovelace' },
          report: {
            id: reportId,
            projectId,
            score: 40,
            plagiarismFlag: true,
            techAgeFlag: false,
            relevanceScore: 40,
            explanation: 'Likely duplicate.',
            routedToReview: true,
            createdAt: new Date('2026-09-02T10:00:01.000Z'),
          },
        }),
      ),
    });
    const service = new ProjectVerifyService(prisma, {
      complete: vi.fn(),
    } as unknown as AiGatewayService);
    const resolved = await service.resolveReview(projectId, {
      resolution: 'REJECT',
      reason: 'Copied the README from a public tutorial.',
    });
    expect(resolved.status).toBe('REJECTED');
  });
});
