import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { CapabilityInferenceService } from './capability-inference.service.js';

const projectId = randomUUID();
const studentId = randomUUID();
const checkId = 'qlix-check-1';

describe('CapabilityInferenceService', () => {
  it('persists baseline capabilities from QLIX smartAssessment observations', async () => {
    const smartAssessmentJson = {
      appliedProficiencyCeiling: 'INTERMEDIATE',
      competencyObservations: [
        {
          competencyId: '828ed14b-2aca-408b-adc1-78e24f22b09d',
          status: 'DEMONSTRATED',
          confidence: 'HIGH',
          evidenceSnippets: ['Implemented websocket gateway with Redis pub/sub.'],
        },
      ],
      gaps: ['No Dockerfile detected'],
    };

    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      skillClaim: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ skill: { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' } }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: projectId,
          studentId,
          title: 'Bus tracker',
          problem: 'Students cannot see buses.',
          approach: 'Built websocket ingest.',
          outcome: 'Pilot reduced confusion.',
          stack: 'TypeScript, Nest',
          skillMappings: [
            {
              skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
              specificContribution: 'Built websocket ingest.',
            },
          ],
          qlixCheckResult: {
            checkId,
            skillsJson: { totals: { analyzedTokens: 4200 } },
            smartAssessmentJson,
          },
        }),
      },
      studentCapability: { deleteMany, createMany },
    };
    const gateway = { hasCallableProvider: vi.fn().mockReturnValue(false) };
    const qlix = {
      buildDigest: vi.fn().mockReturnValue('similarityIndex=12'),
    };

    const service = new CapabilityInferenceService(
      prisma as never,
      qlix as never,
      gateway as never,
    );

    const count = await service.inferForProject(projectId, studentId);

    expect(count).toBe(1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { projectId, studentId, modelVersion: 'capability-inference-v1' },
    });
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            studentId,
            projectId,
            qlixCheckId: checkId,
            assessmentVerified: true,
            capabilityLabel: expect.stringContaining('Python syntax'),
          }),
        ]),
      }),
    );
  });

  it('maps demonstrated QLIX proficiency ceiling PROFICIENT to claim proficiency', async () => {
    const smartAssessmentJson = {
      appliedProficiencyCeiling: 'PROFICIENT',
      competencyObservations: [
        {
          competencyId: 'a12803b7-ad4b-48a4-a042-5a948daaf7ef',
          status: 'DEMONSTRATED',
          confidence: 'HIGH',
          evidenceSnippets: ['Async worker pool with bounded concurrency.'],
        },
      ],
      gaps: [],
    };

    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      skillClaim: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ skill: { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' } }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: projectId,
          studentId,
          title: 'API service',
          problem: 'Latency spikes',
          approach: 'Added async I/O',
          outcome: 'Stable p99',
          stack: 'Python',
          skillMappings: [
            {
              skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
              specificContribution: 'Async I/O layer',
            },
          ],
          qlixCheckResult: {
            checkId,
            skillsJson: { totals: { analyzedTokens: 900 } },
            smartAssessmentJson,
          },
        }),
      },
      studentCapability: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany },
    };
    const service = new CapabilityInferenceService(
      prisma as never,
      { buildDigest: vi.fn().mockReturnValue('similarityIndex=8') } as never,
      { hasCallableProvider: vi.fn().mockReturnValue(false) } as never,
    );

    await service.inferForProject(projectId, studentId);

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            proficiency: 'PROFICIENT',
          }),
        ]),
      }),
    );
  });

  it('returns zero when qlix check result is missing', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: projectId,
          studentId,
          qlixCheckResult: null,
          skillMappings: [],
        }),
      },
      studentCapability: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    const service = new CapabilityInferenceService(
      prisma as never,
      { buildDigest: vi.fn() } as never,
      { hasCallableProvider: vi.fn().mockReturnValue(false) } as never,
    );

    await expect(service.inferForProject(projectId, studentId)).resolves.toBe(0);
  });
});
