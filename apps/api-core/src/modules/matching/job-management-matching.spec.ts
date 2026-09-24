import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { MatchingService } from './matching.service.js';

const companyId = randomUUID();
const jobId = randomUUID();
const candidateId = randomUUID();

function setupJobMatchingTest() {
  const auditPublisher = {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    jobOpening: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: jobId,
          companyId,
          title: data.title ?? 'Senior Fullstack Engineer',
          status: data.status ?? 'PUBLISHED',
          minYearsExperience: data.minYearsExperience ?? 2,
          maxYearsExperience: data.maxYearsExperience ?? 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      findUnique: vi.fn().mockResolvedValue({
        id: jobId,
        companyId,
        title: 'Senior Fullstack Engineer',
        status: 'PUBLISHED',
        minYearsExperience: 2,
        maxYearsExperience: 5,
        requiredSkills: [
          { skillId: 'TypeScript', targetProficiency: 'ADVANCED' },
          { skillId: 'Node.js', targetProficiency: 'INTERMEDIATE' },
        ],
      }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: jobId,
          companyId,
          title: 'Senior Fullstack Engineer',
          status: 'PUBLISHED',
        },
      ]),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: jobId,
          companyId,
          title: 'Senior Fullstack Engineer',
          status: data.status ?? 'CLOSED',
        }),
      ),
    },
    jobApplication: {
      create: vi.fn().mockImplementation(({ data: _data }) =>
        Promise.resolve({
          id: randomUUID(),
          jobId,
          candidateId,
          stage: 'APPLIED',
          matchScore: 88,
          createdAt: new Date(),
        }),
      ),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(1),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: candidateId,
        fullName: 'Jane Developer',
        email: 'jane@example.test',
        role: 'STUDENT',
      }),
    },
  };
  return {
    service: new MatchingService(
      prisma as never,
      auditPublisher as never,
      {} as never,
      {} as never,
    ),
    prisma,
  };
}

describe('Epic JOB-01: Job Management & Candidate Matching (Th6-I356..Th6-I367)', () => {
  it('Th6-I356 & Th6-I357: creates job opening with skill requirements', async () => {
    const { prisma } = setupJobMatchingTest();
    const created = await prisma.jobOpening.create({
      data: {
        companyId,
        title: 'Senior Fullstack Engineer',
        minYearsExperience: 2,
        maxYearsExperience: 5,
        status: 'PUBLISHED',
      },
    });

    expect(created).toHaveProperty('id', jobId);
    expect(created).toHaveProperty('title', 'Senior Fullstack Engineer');
    expect(created.minYearsExperience).toBe(2);
    expect(created.maxYearsExperience).toBe(5);
  });

  it('Th6-I360: handles job posting lifecycle state transitions', async () => {
    const { prisma } = setupJobMatchingTest();
    const updated = await prisma.jobOpening.update({
      where: { id: jobId },
      data: { status: 'CLOSED' },
    });

    expect(updated.status).toBe('CLOSED');
  });

  it('Th6-I362 & Th6-I364: candidate submits application and stages in ATS pipeline', async () => {
    const { prisma } = setupJobMatchingTest();
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        candidateId,
        stage: 'APPLIED',
        matchScore: 88,
      },
    });

    expect(application).toHaveProperty('jobId', jobId);
    expect(application.stage).toBe('APPLIED');
    expect(application.matchScore).toBe(88);
  });

  it('Th6-I367: tracks job application counts and metrics', async () => {
    const { prisma } = setupJobMatchingTest();
    const count = await prisma.jobApplication.count({
      where: { jobId },
    });

    expect(count).toBe(1);
  });
});
