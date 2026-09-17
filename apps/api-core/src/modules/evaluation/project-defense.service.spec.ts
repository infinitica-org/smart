import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectDefenseService } from './project-defense.service.js';

const projectId = randomUUID();
const userId = randomUUID();
const sessionId = randomUUID();

const projectRow = {
  id: projectId,
  studentId: userId,
  title: 'Bus tracker',
  problem: 'Students cannot see buses on campus routes in real time.',
  approach: 'Built a websocket ingest and a small map UI for riders.',
  stack: 'TypeScript, Nest',
  outcome: 'Pilot with 30 students reduced average wait confusion.',
  loomUrl: null,
  githubUrl: 'https://github.com/alice/bus',
  liveUrl: null,
  status: 'SUBMITTED',
  qlixCheckId: null,
  snapshotSha: null,
  createdAt: new Date(),
  report: {
    id: randomUUID(),
    projectId,
    score: 72,
    plagiarismFlag: false,
    techAgeFlag: false,
    relevanceScore: 75,
    explanation:
      'ok\n---smart-verify---\n{"qualityScore":72,"duplicateScore":10,"confidence":0.75,"flags":[],"promptRef":"project-verify@1","auditId":null}',
    routedToReview: false,
    createdAt: new Date(),
  },
};

function setup() {
  const redisStore = new Map<string, string>();
  const redis = {
    get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      redisStore.delete(key);
    }),
  };
  const prisma = {
    project: {
      findUnique: vi.fn().mockResolvedValue(projectRow),
      update: vi.fn().mockResolvedValue(projectRow),
    },
  };
  const gateway = {
    hasCallableProvider: vi.fn().mockReturnValue(true),
    complete: vi.fn().mockResolvedValue({
      output: {
        question: 'What broke first in production and how did you fix it?',
        probes: 'FAILURE_MODES',
        isFinalTurn: false,
      },
      auditId: randomUUID(),
    }),
  };
  const speech = {
    transcribe: vi
      .fn()
      .mockResolvedValue('I owned the websocket service and debugged Redis timeouts.'),
    synthesize: vi.fn().mockResolvedValue(null),
  };
  const storage = {
    getSignedUploadUrl: vi.fn().mockResolvedValue('https://minio/upload'),
  };
  let interviewStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' = 'PENDING';
  const interviewGate = {
    getState: vi.fn(async () => ({
      interviewRequired: true,
      interviewStatus,
      interviewCompletedAt: null,
    })),
    markInProgress: vi.fn(async () => {
      interviewStatus = 'IN_PROGRESS';
    }),
    markPending: vi.fn(async () => {
      interviewStatus = 'PENDING';
    }),
    markCompleted: vi.fn(async () => {
      interviewStatus = 'COMPLETED';
    }),
  };
  const outbox = { enqueueEnvelope: vi.fn() };
  const proctoring = {
    assertInterviewReady: vi.fn().mockResolvedValue(undefined),
    isProctorLocked: vi.fn().mockResolvedValue(false),
  };

  const service = new ProjectDefenseService(
    prisma as never,
    redis as never,
    gateway as never,
    speech as never,
    storage as never,
    interviewGate as never,
    proctoring as never,
    outbox as never,
  );

  return { service, gateway, speech, interviewGate, prisma, outbox, redisStore, proctoring };
}

describe('ProjectDefenseService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects prepare while QLIX verification is still running', async () => {
    const { service, prisma } = setup();
    prisma.project.findUnique.mockResolvedValueOnce({
      ...projectRow,
      qlixCheckId: 'check-1',
      report: null,
    });

    await expect(service.prepare(projectId, userId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('prepare reserves a session without starting the interview clock', async () => {
    const { service, interviewGate, redisStore } = setup();
    const prepared = await service.prepare(projectId, userId);
    expect(prepared.sessionId).toBeTruthy();
    expect(interviewGate.markInProgress).not.toHaveBeenCalled();

    const raw = redisStore.get(`project:defense:session:${prepared.sessionId}`);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw!) as { startedAt: string | null };
    expect(stored.startedAt).toBeNull();
  });

  it('start activates a prepared session and marks interview in progress', async () => {
    const { service, interviewGate } = setup();
    const prepared = await service.prepare(projectId, userId);
    const res = await service.start(projectId, userId);

    expect(res.session.sessionId).toBe(prepared.sessionId);
    expect(res.session.secondsRemaining).toBeGreaterThan(0);
    expect(interviewGate.markInProgress).toHaveBeenCalledWith(projectId);
  });

  it('starts with a project-specific opening question from the examiner', async () => {
    const { service, gateway } = setup();
    gateway.complete.mockResolvedValueOnce({
      output: {
        question:
          'For Bus tracker, where did you use TypeScript in the websocket ingest you built?',
        probes: 'SKILLS_APPLICATION',
        isFinalTurn: false,
      },
      auditId: randomUUID(),
    });

    const res = await service.start(projectId, userId);

    expect(res.openingPromptText).toContain('Bus tracker');
    expect(res.openingPromptText).not.toContain('Walk us through this project');
    expect(res.session.maxDurationSeconds).toBe(600);
    expect(res.session.secondsRemaining).toBeGreaterThan(0);
    expect(res.session.turns).toHaveLength(1);
    expect(res.session.turns[0]?.role).toBe('EXAMINER');
    expect(gateway.complete).toHaveBeenCalledTimes(1);
  });

  it('passes qlixReportDigest to the examiner when stored on the verify report', async () => {
    const { service, gateway, prisma } = setup();
    const qlixReportDigest =
      'similarityIndex=15\naiLikelihood=45\nsuspicion=medium\nElevated AI patterns detected.';
    prisma.project.findUnique.mockResolvedValue({
      ...projectRow,
      report: {
        ...projectRow.report,
        explanation: `ok\n---smart-verify---\n${JSON.stringify({
          qualityScore: 72,
          duplicateScore: 15,
          confidence: 0.85,
          flags: ['QLIX_AUTHORSHIP_ELEVATED'],
          promptRef: 'project-verify@1',
          auditId: null,
          qlixReportDigest,
        })}`,
      },
    });
    gateway.complete.mockResolvedValueOnce({
      output: {
        question:
          'For Bus tracker, can you explain the elevated AI patterns QLIX flagged in your websocket code?',
        probes: 'OWNERSHIP',
        isFinalTurn: false,
      },
      auditId: randomUUID(),
    });

    await service.prepare(projectId, userId);
    await service.start(projectId, userId);

    expect(gateway.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          qlixReportDigest,
        }),
      }),
    );
  });

  it('prepare clears a prior attempt so the next start is fresh', async () => {
    const { service, gateway, redisStore, interviewGate } = setup();
    gateway.complete
      .mockResolvedValueOnce({
        output: {
          question: 'For Bus tracker, where did you use TypeScript in the websocket ingest?',
          probes: 'SKILLS_APPLICATION',
          isFinalTurn: false,
        },
        auditId: randomUUID(),
      })
      .mockResolvedValueOnce({
        output: {
          question: 'For Bus tracker, how did Redis GEO keys work in your live map?',
          probes: 'SKILLS_APPLICATION',
          isFinalTurn: false,
        },
        auditId: randomUUID(),
      });

    const firstPrepare = await service.prepare(projectId, userId);
    const firstStart = await service.start(projectId, userId);
    expect(firstStart.session.turns).toHaveLength(1);

    const secondPrepare = await service.prepare(projectId, userId);
    expect(secondPrepare.sessionId).not.toBe(firstPrepare.sessionId);
    expect(redisStore.has(`project:defense:session:${firstPrepare.sessionId}`)).toBe(false);
    expect(interviewGate.markPending).toHaveBeenCalled();

    const secondStart = await service.start(projectId, userId);
    expect(secondStart.openingPromptText).not.toBe(firstStart.openingPromptText);
    expect(secondStart.session.turns).toHaveLength(1);
    expect(gateway.complete).toHaveBeenCalledTimes(2);
  });

  it('abandon clears the active defense session', async () => {
    const { service, redisStore, interviewGate } = setup();
    const prepared = await service.prepare(projectId, userId);
    await service.start(projectId, userId);
    await service.abandon(projectId, userId);
    expect(redisStore.has(`project:defense:session:${prepared.sessionId}`)).toBe(false);
    expect(redisStore.get(`project:defense:active:${projectId}`)).toBeUndefined();
    expect(interviewGate.markCompleted).not.toHaveBeenCalled();
    expect(interviewGate.markPending).toHaveBeenCalled();
  });

  it('rejects start when verify report is missing', async () => {
    const { service, prisma } = setup();
    prisma.project.findUnique.mockResolvedValueOnce({ ...projectRow, report: null });
    await expect(service.start(projectId, userId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('student speaks first — reply calls examiner after transcript', async () => {
    const { service, gateway } = setup();
    gateway.complete
      .mockResolvedValueOnce({
        output: {
          question: 'For Bus tracker, where did you use TypeScript in the websocket ingest?',
          probes: 'SKILLS_APPLICATION',
          isFinalTurn: false,
        },
        auditId: randomUUID(),
      })
      .mockResolvedValueOnce({
        output: {
          question: 'What broke first in production and how did you fix it?',
          probes: 'FAILURE_MODES',
          isFinalTurn: false,
        },
        auditId: randomUUID(),
      });

    const started = await service.start(projectId, userId);
    const reply = await service.reply(projectId, userId, {
      sessionId: started.session.sessionId,
      transcript: 'I designed the GPS ingest and wrote the websocket fan-out.',
    });
    expect(gateway.complete).toHaveBeenCalledTimes(2);
    expect(reply.questionText).toContain('production');
  });

  it('does not end early when examiner requests final turn on first answer', async () => {
    const { service, gateway } = setup();
    gateway.complete
      .mockResolvedValueOnce({
        output: {
          question: 'For Bus tracker, where did you use TypeScript in the websocket ingest?',
          probes: 'SKILLS_APPLICATION',
          isFinalTurn: false,
        },
        auditId: randomUUID(),
      })
      .mockResolvedValueOnce({
        output: {
          question: 'Thanks — one more thing about Redis?',
          probes: 'CLOSING',
          isFinalTurn: true,
        },
        auditId: randomUUID(),
      });

    const started = await service.start(projectId, userId);
    const reply = await service.reply(projectId, userId, {
      sessionId: started.session.sessionId,
      transcript: 'I built the GPS ingest and wrote the websocket fan-out.',
    });

    expect(reply.isFinalTurn).toBe(false);
    expect(reply.questionText).toContain('Redis');
  });

  it('complete grades once and never sets REJECTED', async () => {
    const { service, gateway, prisma } = setup();
    gateway.complete
      .mockResolvedValueOnce({
        output: {
          question: 'For Bus tracker, where did you use TypeScript in the websocket ingest?',
          probes: 'SKILLS_APPLICATION',
          isFinalTurn: false,
        },
        auditId: randomUUID(),
      })
      .mockResolvedValueOnce({
        output: {
          question: 'Why that database?',
          probes: 'TRADEOFFS',
          isFinalTurn: true,
        },
        auditId: randomUUID(),
      })
      .mockResolvedValueOnce({
        output: {
          dimensions: {
            depthOfUnderstanding: 80,
            ownershipAndOriginality: 78,
            defenseQuality: 75,
          },
          ownershipConcern: false,
          ownershipConcernReason: null,
          justification: 'Candidate explained concrete decisions.',
          evidence: ['Named Redis timeout fix'],
        },
        auditId: randomUUID(),
      });

    const started = await service.start(projectId, userId);
    await service.reply(projectId, userId, {
      sessionId: started.session.sessionId,
      transcript: 'I chose Postgres for geospatial queries and Redis for live positions.',
    });
    const done = await service.complete(projectId, userId, {
      sessionId: started.session.sessionId,
    });
    expect(done.projectStatus).toBe('VERIFIED');
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'VERIFIED' } }),
    );
  });

  it('rejects complete when session is already finished', async () => {
    const { service, gateway } = setup();
    gateway.complete
      .mockResolvedValueOnce({
        output: {
          question: 'For Bus tracker, where did you use TypeScript in the websocket ingest?',
          probes: 'SKILLS_APPLICATION',
          isFinalTurn: false,
        },
        auditId: randomUUID(),
      })
      .mockResolvedValueOnce({
        output: {
          question: 'What broke first in production?',
          probes: 'FAILURE_MODES',
          isFinalTurn: false,
        },
        auditId: randomUUID(),
      })
      .mockResolvedValueOnce({
        output: {
          dimensions: {
            depthOfUnderstanding: 80,
            ownershipAndOriginality: 78,
            defenseQuality: 75,
          },
          ownershipConcern: false,
          ownershipConcernReason: null,
          justification: 'Candidate explained concrete websocket ownership decisions.',
          evidence: [],
        },
        auditId: randomUUID(),
      });

    const started = await service.start(projectId, userId);
    await service.reply(projectId, userId, {
      sessionId: started.session.sessionId,
      transcript: 'I built the websocket layer.',
    });
    await service.complete(projectId, userId, {
      sessionId: started.session.sessionId,
    });

    await expect(
      service.complete(projectId, userId, {
        sessionId: started.session.sessionId,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'session_inactive' }),
    });
  });

  it('completes with under review when proctoring locks the session', async () => {
    const { service, gateway, prisma, proctoring, interviewGate } = setup();
    proctoring.isProctorLocked.mockResolvedValue(true);
    const prepared = await service.prepare(projectId, userId);
    await service.start(projectId, userId);
    gateway.complete.mockClear();
    proctoring.assertInterviewReady.mockClear();

    const done = await service.complete(projectId, userId, {
      sessionId: prepared.sessionId,
      integrityTerminated: true,
    });

    expect(done.interviewStatus).toBe('COMPLETED');
    expect(done.projectStatus).toBe('UNDER_REVIEW');
    expect(done.grade.ownershipConcern).toBe(true);
    expect(gateway.complete).not.toHaveBeenCalled();
    expect(proctoring.assertInterviewReady).not.toHaveBeenCalled();
    expect(interviewGate.markCompleted).toHaveBeenCalledWith(projectId);
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'UNDER_REVIEW' } }),
    );
  });

  it('rejects integrity termination when proctoring is not locked', async () => {
    const { service, proctoring } = setup();
    proctoring.isProctorLocked.mockResolvedValue(false);
    const prepared = await service.prepare(projectId, userId);
    await service.start(projectId, userId);

    await expect(
      service.complete(projectId, userId, {
        sessionId: prepared.sessionId,
        integrityTerminated: true,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'proctor_not_locked' }),
    });
  });

  it('resets gate to PENDING when the active Redis session expired before start', async () => {
    const { service, redisStore, interviewGate } = setup();
    await service.prepare(projectId, userId);
    const started = await service.start(projectId, userId);
    redisStore.delete(`project:defense:session:${started.session.sessionId}`);
    interviewGate.markPending.mockClear();
    await service.start(projectId, userId);
    expect(interviewGate.markPending).toHaveBeenCalled();
  });

  it('uses local stub when no AI provider is configured', async () => {
    const { service, gateway } = setup();
    gateway.hasCallableProvider.mockReturnValue(false);
    await service.prepare(projectId, userId);
    const res = await service.start(projectId, userId);
    expect(res.openingPromptText).toContain('Bus tracker');
    expect(gateway.complete).not.toHaveBeenCalled();
  });

  it('surfaces gateway failures during start', async () => {
    const { service, gateway } = setup();
    gateway.complete.mockRejectedValueOnce(
      new ServiceUnavailableException({
        error: 'ai_provider_unavailable',
        message: 'All providers failed.',
        statusCode: 503,
      }),
    );
    await service.prepare(projectId, userId);
    await expect(service.start(projectId, userId)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects malformed examiner output from the gateway', async () => {
    const { service, gateway } = setup();
    gateway.complete.mockResolvedValueOnce({
      output: { question: 'too short' },
      auditId: randomUUID(),
    });
    await service.prepare(projectId, userId);
    await expect(service.start(projectId, userId)).rejects.toThrow();
  });

  it('rejects reply with audio key outside project defense prefix', async () => {
    const { service, gateway } = setup();
    gateway.complete.mockResolvedValueOnce({
      output: {
        question: 'For Bus tracker, where did you use TypeScript in the websocket ingest?',
        probes: 'SKILLS_APPLICATION',
        isFinalTurn: false,
      },
      auditId: randomUUID(),
    });

    const started = await service.start(projectId, userId);
    await expect(
      service.reply(projectId, userId, {
        sessionId: started.session.sessionId,
        audioObjectKey: `resumes/${userId}/stolen-cv.pdf`,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'invalid_audio_key' }),
    });
  });
});
