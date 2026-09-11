import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ACTIVE_TAXONOMY_VERSION } from '@smart/contracts';
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
      passive.set(signal.userId, signal);
    }),
    getPassiveSignal: vi.fn(async (userId) => (passive.get(userId) as never) ?? null),
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

function createService(store: CorroborationRedisStore) {
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
  };
  const service = new CorroborationService(
    store,
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
        dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
        skillCode: 'DATA_STRUCTURES_ALGORITHMS',
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

  it('creates one review flag and audits creation on contradiction', async () => {
    const store = createStore();
    const { service, auditPublisher } = createService(store);
    await service.ingestPassiveSignal(passiveSignal);

    await service.fuseWithAssessment({
      userId: USER_A,
      claimId: CLAIM_A,
      skillCode: 'DATA_STRUCTURES_ALGORITHMS',
      assessedAt: '2026-09-11T01:00:00.000Z',
      entries: [
        {
          dimension: {
            taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
            dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
            skillCode: 'DATA_STRUCTURES_ALGORITHMS',
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
      skillCode: 'DATA_STRUCTURES_ALGORITHMS',
      assessedAt: '2026-09-11T01:00:00.000Z',
      entries: [
        {
          dimension: {
            taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
            dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
            skillCode: 'DATA_STRUCTURES_ALGORITHMS',
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
      skillCode: 'DATA_STRUCTURES_ALGORITHMS',
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
      skillCode: 'DATABASE_FUNDAMENTALS',
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
      skillCode: 'DATABASE_FUNDAMENTALS',
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
