import { describe, expect, it, vi } from 'vitest';
import { PROJECT_VERIFY_PROMPT_REF, SMART_TOPICS } from '@smart/contracts';
import { ProjectVerifyService } from './project-verify.service.js';
import { searchPublicProjectMatches } from './project-verify.web-similarity.js';
import type { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';

vi.mock('./project-verify.web-similarity.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./project-verify.web-similarity.js')>();
  return {
    ...actual,
    searchPublicProjectMatches: vi.fn().mockResolvedValue({ ok: true, score: 0, hits: [] }),
  };
});

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

const redis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn() };

function service(
  prisma: PrismaService,
  gateway: unknown,
  outbox: { enqueueEnvelope: ReturnType<typeof vi.fn> } = {
    enqueueEnvelope: vi.fn().mockResolvedValue(undefined),
  },
) {
  return new ProjectVerifyService(
    prisma,
    gateway as AiGatewayService,
    outbox as never,
    redis as never,
  );
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
    const enqueueEnvelope = vi.fn().mockResolvedValue(undefined);
    const result = await service(prisma, { complete }, { enqueueEnvelope }).verifyProject(
      projectId,
    );

    expect(result.status).toBe('UNDER_REVIEW');
    expect(enqueueEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: SMART_TOPICS.projectVerifyCompleted,
        partitionKey: projectId,
      }),
    );
    expect(result.report?.routedToReview).toBe(true);
    expect(result.status).not.toBe('REJECTED');
    expect(complete.mock.calls[0]?.[0]).toMatchObject({
      promptRef: PROJECT_VERIFY_PROMPT_REF,
      priority: 'P2_ASYNC_EVAL',
    });
    expect(complete.mock.calls[0]?.[0].variables.snapshotDigest).toContain('Public web similarity');
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

    const result = await service(prisma, { complete }).verifyProject(projectId);
    expect(result.status).toBe('UNDER_REVIEW');
    expect(prisma.projectVerificationReport.upsert).toHaveBeenCalled();
  });

  it('routes PUBLIC_WEB_SIMILARITY to review and never auto-rejects', async () => {
    vi.mocked(searchPublicProjectMatches).mockResolvedValueOnce({
      ok: true,
      score: 88,
      hits: [
        {
          title: 'other/bus-tracker',
          url: 'https://github.com/other/bus-tracker',
          snippet: template.problem,
        },
      ],
    });
    const complete = vi.fn().mockResolvedValue({
      output: {
        relevanceScore: 80,
        qualityScore: 80,
        confidence: 0.95,
        explanation: 'Write-up matches a public repository description closely.',
        evidence: ['Same campus bus wording'],
        gaps: [],
      },
      auditId: null,
    });
    const updated = {
      ...projectRow('UNDER_REVIEW'),
      report: {
        id: reportId,
        projectId,
        score: 50,
        plagiarismFlag: true,
        techAgeFlag: false,
        relevanceScore: 80,
        explanation:
          'Write-up matches a public repository description closely.\n---smart-verify---\n' +
          JSON.stringify({
            qualityScore: 80,
            duplicateScore: 88,
            confidence: 0.95,
            flags: ['PUBLIC_WEB_SIMILARITY'],
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

    const result = await service(prisma, { complete }).verifyProject(projectId);
    expect(result.status).toBe('UNDER_REVIEW');
    expect(result.status).not.toBe('REJECTED');
    expect(result.report?.flags).toContain('PUBLIC_WEB_SIMILARITY');
    expect(prisma.projectVerificationReport.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ plagiarismFlag: true, routedToReview: true }),
      }),
    );
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
    const resolved = await service(prisma, { complete: vi.fn() }).resolveReview(projectId, {
      resolution: 'REJECT',
      reason: 'Copied the README from a public tutorial.',
    });
    expect(resolved.status).toBe('REJECTED');
  });
});
