import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignalSourceAdapter } from './adapters/signal-source.adapter.js';
import type { AdapterRegistryService } from './adapter-registry.service.js';
import type { SignalConnectionStore } from './signal-connection.store.js';
import { SignalIngestionService } from './signal-ingestion.service.js';

describe('SignalIngestionService', () => {
  const mockAdapter: SignalSourceAdapter = {
    sourceId: 'HACKERRANK',
    supportedConsentScopes: ['hackerrank.profile.public'],
    validateConnectInput: vi.fn(),
    fetchRaw: vi.fn().mockResolvedValue({
      userId: '00000000-0000-4000-8000-000000000001',
      sourceId: 'HACKERRANK',
      externalAccountId: 'ada_hr',
      fetchedAt: '2026-09-11T00:00:00.000Z',
      consentScope: 'hackerrank.profile.public',
      taxonomyVersion: 'inf-05@3',
      payload: {
        sourceId: 'HACKERRANK',
        badges: [],
        solvedByTag: [{ tag: 'Python', count: 3, difficulty: 'UNKNOWN' }],
      },
    }),
  };

  const registry = {
    get: vi.fn().mockReturnValue(mockAdapter),
  } as unknown as AdapterRegistryService;

  const connections = {
    get: vi.fn(),
    list: vi.fn(),
    upsert: vi.fn(),
    updateFetchResult: vi.fn(),
    delete: vi.fn(),
    toSummary: vi.fn(),
  } as unknown as SignalConnectionStore;

  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const redis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  };

  const service = new SignalIngestionService(registry, connections, outbox, audit, redis);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes signal.ingested on successful ingest', async () => {
    vi.mocked(connections.get).mockResolvedValue({
      id: 'conn-1',
      userId: '00000000-0000-4000-8000-000000000001',
      sourceId: 'HACKERRANK',
      externalAccountId: 'ada_hr',
      consentScopes: ['hackerrank.profile.public'],
      status: 'ACTIVE',
      connectedAt: '2026-09-11T00:00:00.000Z',
      lastFetchedAt: null,
      lastError: null,
      metadata: {},
    });

    await service.ingest('00000000-0000-4000-8000-000000000001', 'HACKERRANK');

    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'smart.signal.ingested' }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'signal.fetch.completed' }),
    );
  });

  it('skips refresh when per-source cooldown is active', async () => {
    vi.mocked(connections.list).mockResolvedValue([
      {
        id: 'conn-1',
        userId: '00000000-0000-4000-8000-000000000001',
        sourceId: 'HACKERRANK',
        externalAccountId: 'ada_hr',
        consentScopes: ['hackerrank.profile.public'],
        status: 'ACTIVE',
        connectedAt: '2026-09-11T00:00:00.000Z',
        lastFetchedAt: '2026-09-11T00:00:00.000Z',
        lastError: null,
        metadata: {},
      },
    ]);
    vi.mocked(redis.get).mockResolvedValue('1');

    const result = await service.refresh('00000000-0000-4000-8000-000000000001', {});

    expect(result.skippedCooldown).toEqual(['HACKERRANK']);
    expect(result.queued).toHaveLength(0);
  });

  it('throws when no active connection exists', async () => {
    vi.mocked(connections.get).mockResolvedValue(null);
    await expect(
      service.ingest('00000000-0000-4000-8000-000000000001', 'HACKERRANK'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws on duplicate fetch within dedupe window', async () => {
    vi.mocked(connections.get).mockResolvedValue({
      id: 'conn-1',
      userId: '00000000-0000-4000-8000-000000000001',
      sourceId: 'HACKERRANK',
      externalAccountId: 'ada_hr',
      consentScopes: ['hackerrank.profile.public'],
      status: 'ACTIVE',
      connectedAt: '2026-09-11T00:00:00.000Z',
      lastFetchedAt: null,
      lastError: null,
      metadata: {},
    });
    vi.mocked(redis.get).mockImplementation(async (key: string) =>
      key.startsWith('signal-ingestion:fetch:') ? '1' : null,
    );

    await expect(
      service.ingest('00000000-0000-4000-8000-000000000001', 'HACKERRANK'),
    ).rejects.toThrow(ConflictException);
  });
});
