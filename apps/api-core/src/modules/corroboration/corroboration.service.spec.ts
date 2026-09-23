import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ACTIVE_TAXONOMY_VERSION } from '@smart/contracts';
import { DEFAULT_SIGNAL_WEIGHT_MODEL } from '@smart/scoring-engine';
import { CorroborationService } from './corroboration.service.js';
import type { CorroborationRedisStore } from './corroboration-redis.store.js';

const USER_A = '00000000-0000-4000-8000-000000000001';
const USER_B = '00000000-0000-4000-8000-000000000002';
const CLAIM_A = '00000000-0000-4000-8000-000000000010';
const INST_A = '00000000-0000-4000-8000-000000000100';
const INST_B = '00000000-0000-4000-8000-000000000200';

function createStore(overrides: Partial<CorroborationRedisStore> = {}): CorroborationRedisStore {
  const passive = new Map<string, unknown>();
  const snapshots = new Map<string, unknown>();
  const flags = new Map<string, unknown>();
  const pending = new Set<string>();
  const claimKeys = new Map<string, string>();
  const processed = new Set<string>();

  const store = {
    savePassiveSignal: vi.fn(async (signal) => {
      passive.set(`${signal.userId}:${signal.sourceId}`, signal);
    }),
    getPassiveSignal: vi.fn(
      async (userId, sourceId) => (passive.get(`${userId}:${sourceId}`) as never) ?? null,
    ),
    getAllPassiveSignals: vi.fn(async (userId) =>
      [...passive.entries()]
        .filter(([key]) => key.startsWith(`${userId}:`))
        .map(([, signal]) => signal),
    ),
    getSnapshot: vi.fn(async (userId) => (snapshots.get(userId) as never) ?? null),
    saveSnapshot: vi.fn(async (snapshot) => {
      snapshots.set(snapshot.userId, snapshot);
    }),
    saveFlag: vi.fn(async (flag) => {
      flags.set(flag.id, flag);
      pending.add(flag.id);
      if (flag.claimId) claimKeys.set(`${flag.claimId}:${flag.skillCode}`, flag.id);
    }),
    getFlag: vi.fn(async (id) => (flags.get(id) as never) ?? null),
    getPendingFlagIdForClaim: vi.fn(
      async (claimId, skillCode) => claimKeys.get(`${claimId}:${skillCode}`) ?? null,
    ),
    listPendingFlags: vi.fn(async () => [...pending].map((id) => flags.get(id)).filter(Boolean)),
    listPendingFlagsPaginated: vi.fn(async (page, pageSize) => {
      const all = [...pending].map((id) => flags.get(id)).filter(Boolean);
      const start = (page - 1) * pageSize;
      return { flags: all.slice(start, start + pageSize), total: all.length };
    }),
    resolveFlag: vi.fn(async (id, note) => {
      const flag = flags.get(id) as {
        resolvedAt: string | null;
        resolutionNote: string | null;
        claimId?: string;
        skillCode?: string;
      };
      if (!flag || flag.resolvedAt) return null;
      const resolved = { ...flag, resolvedAt: new Date().toISOString(), resolutionNote: note };
      flags.set(id, resolved);
      pending.delete(id);
      return resolved;
    }),
    tryClaimProcessedEvent: vi.fn(async (claimId, eventId) => {
      const key = `${claimId}:${eventId}`;
      if (processed.has(key)) return false;
      processed.add(key);
      return true;
    }),
    tryAcquireOutboxDebounce: vi.fn(async () => true),
    ...overrides,
  };

  return store as unknown as CorroborationRedisStore;
}

function createService(
  store: CorroborationRedisStore,
  prismaOverrides: Record<string, unknown> = {},
) {
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
  const prisma = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === USER_A) return { institutionId: INST_A };
        if (where.id === USER_B) return { institutionId: INST_B };
        return null;
      }),
    },
    skillClaim: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    passiveSignalEvidence: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    corroborationSnapshot: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    corroborationReviewFlag: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    evidenceRecord: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    evidenceContradiction: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    ...prismaOverrides,
  };
  const weightModels = {
    getActiveModel: vi.fn().mockResolvedValue(DEFAULT_SIGNAL_WEIGHT_MODEL),
  };
  const service = new CorroborationService(
    store,
    weightModels as never,
    outbox as never,
    auditPublisher as never,
    prisma as never,
  );
  return { service, outbox, auditPublisher, prisma };
}

const passiveSignal = {
  userId: USER_A,
  sourceId: 'GITHUB' as const,
  taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
  encodedAt: '2026-09-11T00:00:00.000Z',
  consentScope: 'github.onboarding.public_repos',
  fetchedAt: '2026-09-11T00:00:00.000Z',
  entries: [
    {
      dimension: {
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
      },
      sourceId: 'GITHUB' as const,
      score: 0.05,
      confidence: 0.7,
    },
  ],
};

describe('CorroborationService', () => {
  it('rejects passive ingest without consentScope', async () => {
    const { service } = createService(createStore());
    await expect(
      service.ingestPassiveSignal({
        ...passiveSignal,
        consentScope: undefined,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts QLIX passive ingest with project verification consent scope', async () => {
    const store = createStore();
    const { service } = createService(store);
    await service.ingestPassiveSignal({
      userId: USER_A,
      sourceId: 'QLIX',
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      encodedAt: '2026-09-11T00:00:00.000Z',
      consentScope: 'project.verification.qlix',
      fetchedAt: '2026-09-11T00:00:00.000Z',
      entries: [
        {
          dimension: {
            taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
            dimensionKey: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
            skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
          },
          sourceId: 'QLIX',
          score: 0.75,
          confidence: 0.85,
        },
      ],
    });
    expect(store.savePassiveSignal).toHaveBeenCalled();
  });

  it('rejects passive ingest with unknown consentScope for source', async () => {
    const { service } = createService(createStore());
    await expect(
      service.ingestPassiveSignal({
        ...passiveSignal,
        consentScope: 'hackerrank.profile.public',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'invalid_consent_scope' }),
    });
  });

  it('ingests passive signal and persists snapshot', async () => {
    const store = createStore();
    const { service, outbox } = createService(store);
    await service.ingestPassiveSignal({
      ...passiveSignal,
      entries: passiveSignal.entries.map((e) => ({
        ...e,
        dimension: {
          ...e.dimension,
          dimensionKey: 'LANGUAGE_PROFICIENCY',
          skillCode: 'LANGUAGE_PROFICIENCY',
        },
      })),
    });
    expect(store.savePassiveSignal).toHaveBeenCalled();
    expect(store.saveSnapshot).toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).toHaveBeenCalled();
  });

  it('fuses signals from multiple sources for the same user instead of overwriting', async () => {
    const store = createStore();
    const { service } = createService(store);

    await service.ingestPassiveSignal(passiveSignal);
    await service.ingestPassiveSignal({
      ...passiveSignal,
      sourceId: 'PROFESSIONALCREDENTIAL',
      consentScope: 'credential.candidate.declared',
      entries: [
        {
          dimension: {
            taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
            dimensionKey: 'SQL_QUERY_OPTIMIZATION',
            skillCode: 'SQL_QUERY_OPTIMIZATION',
          },
          sourceId: 'PROFESSIONALCREDENTIAL',
          score: 0.9,
          confidence: 0.6,
        },
      ],
    });

    const allSignals = await store.getAllPassiveSignals(USER_A);
    expect(allSignals.map((s) => s.sourceId).sort()).toEqual(['GITHUB', 'PROFESSIONALCREDENTIAL']);

    const lastSnapshotCall = store.saveSnapshot.mock.calls.at(-1)?.[0];
    const dimensionKeys = lastSnapshotCall.readouts.map(
      (r: { dimension: { dimensionKey: string } }) => r.dimension.dimensionKey,
    );
    expect(dimensionKeys).toEqual(
      expect.arrayContaining([
        'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        'SQL_QUERY_OPTIMIZATION',
      ]),
    );
  });

  it('refusions verified skill claims after passive ingest when assessment data exists', async () => {
    const store = createStore();
    const { service } = createService(store, {
      skillClaim: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: CLAIM_A,
            skill: { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' },
            verificationAttempts: [
              {
                claimedProficiency: 'ADVANCED',
                scorePercent: 82,
                passed: true,
              },
            ],
          },
        ]),
      },
    });

    await service.ingestPassiveSignal({
      userId: USER_A,
      sourceId: 'QLIX',
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      encodedAt: '2026-09-11T00:00:00.000Z',
      consentScope: 'project.verification.qlix',
      fetchedAt: '2026-09-11T00:00:00.000Z',
      entries: [
        {
          dimension: {
            taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
            dimensionKey: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
            skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
          },
          sourceId: 'QLIX',
          score: 0.78,
          confidence: 0.85,
        },
      ],
    });

    await service.refusionVerifiedSkillClaims(USER_A, {
      skillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
    });

    expect(store.saveSnapshot).toHaveBeenCalled();
    const snapshot = (store.saveSnapshot as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0];
    expect(
      snapshot.readouts.some(
        (row: { assessmentScore: number | null }) => row.assessmentScore === 82,
      ),
    ).toBe(true);
  });

  it('creates one review flag and audits creation on contradiction', async () => {
    const store = createStore();
    const { service, auditPublisher } = createService(store);
    await service.ingestPassiveSignal(passiveSignal);

    await service.fuseWithAssessment({
      userId: USER_A,
      claimId: CLAIM_A,
      skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
      assessedAt: '2026-09-11T01:00:00.000Z',
      entries: [
        {
          dimension: {
            taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
            dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
            skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
          },
          scorePercent: 85,
          passed: true,
          proficiencyLevel: 'INTERMEDIATE',
        },
      ],
    });

    expect(store.saveFlag).toHaveBeenCalledTimes(1);
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'corroboration.review_flag.created' }),
    );
  });

  it('dedupes duplicate verification events via idempotency key', async () => {
    const store = createStore();
    const { service } = createService(store);
    await service.ingestPassiveSignal(passiveSignal);

    const assessment = {
      userId: USER_A,
      claimId: CLAIM_A,
      skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
      assessedAt: '2026-09-11T01:00:00.000Z',
      entries: [
        {
          dimension: {
            taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
            dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
            skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
          },
          scorePercent: 85,
          passed: true,
          proficiencyLevel: 'INTERMEDIATE' as const,
        },
      ],
    };

    await service.fuseWithAssessment(assessment, { eventId: 'evt-1' });
    await service.fuseWithAssessment(assessment, { eventId: 'evt-1' });

    expect(store.saveFlag).toHaveBeenCalledTimes(1);
  });

  it('scopes institution admin flags to their institution only', async () => {
    const store = createStore();
    const { service } = createService(store);

    await store.saveFlag({
      id: '00000000-0000-4000-8000-000000000301',
      userId: USER_A,
      institutionId: INST_A,
      claimId: CLAIM_A,
      skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
      severity: 'MEDIUM',
      reason: 'test',
      passiveScore: 0.1,
      assessmentScore: 80,
      createdAt: '2026-09-11T00:00:00.000Z',
      resolvedAt: null,
      resolutionNote: null,
    });
    await store.saveFlag({
      id: '00000000-0000-4000-8000-000000000302',
      userId: USER_B,
      institutionId: INST_B,
      claimId: '00000000-0000-4000-8000-000000000011',
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      severity: 'MEDIUM',
      reason: 'test',
      passiveScore: 0.1,
      assessmentScore: 80,
      createdAt: '2026-09-11T00:00:00.000Z',
      resolvedAt: null,
      resolutionNote: null,
    });

    const instAdminView = await service.listReviewFlags(
      { sub: 'admin-a', role: 'INSTITUTION_ADMIN', inst: INST_A },
      { page: 1, pageSize: 25 },
    );
    expect(instAdminView.flags).toHaveLength(1);
    expect(instAdminView.flags[0]?.userId).toBe(USER_A);

    const superView = await service.listReviewFlags(
      { sub: 'super', role: 'SUPER_ADMIN', inst: null },
      { page: 1, pageSize: 25 },
    );
    expect(superView.flags).toHaveLength(2);
  });

  it('audits resolve and blocks cross-institution resolve', async () => {
    const store = createStore();
    const { service, auditPublisher } = createService(store);
    const flagId = '00000000-0000-4000-8000-000000000301';

    await store.saveFlag({
      id: flagId,
      userId: USER_B,
      institutionId: INST_B,
      claimId: '00000000-0000-4000-8000-000000000011',
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      severity: 'MEDIUM',
      reason: 'test',
      passiveScore: 0.1,
      assessmentScore: 80,
      createdAt: '2026-09-11T00:00:00.000Z',
      resolvedAt: null,
      resolutionNote: null,
    });

    await expect(
      service.resolveReviewFlag(
        { sub: 'admin-a', role: 'INSTITUTION_ADMIN', inst: INST_A },
        flagId,
        'reviewed ok',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const resolved = await service.resolveReviewFlag(
      { sub: 'admin-b', role: 'INSTITUTION_ADMIN', inst: INST_B },
      flagId,
      'reviewed ok',
    );
    expect(resolved.resolvedAt).not.toBeNull();
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'corroboration.review_flag.resolved' }),
    );
  });

  it('throws not found when resolving missing flag', async () => {
    const { service } = createService(createStore());
    await expect(
      service.resolveReviewFlag(
        { sub: 'super', role: 'SUPER_ADMIN', inst: null },
        '00000000-0000-4000-8000-000000000999',
        'nope',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
