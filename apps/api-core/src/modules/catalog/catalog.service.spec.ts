import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { TRACK_DEFINITIONS } from '@smart/contracts';
import { CatalogService } from './catalog.service.js';

/**
 * Stub that simulates DB unavailable — triggers the contract-fallback path in
 * CatalogService so the test requires no real Postgres connection.
 */
const dbDownStub = {
  track: {
    findMany: async () => {
      throw new Error('db unavailable');
    },
    findUnique: async () => null,
  },
} as never;

describe('CatalogService', () => {
  const service = new CatalogService(dbDownStub);

  it('listTracks() returns all 10 tracks from contract fallback when DB is unavailable', async () => {
    const tracks = await service.listTracks();
    expect(tracks).toHaveLength(TRACK_DEFINITIONS.length);
    expect(tracks).toHaveLength(10);
  });

  it('each track carries 5 levels (L1–L5)', async () => {
    const tracks = await service.listTracks();
    for (const track of tracks) {
      expect(track.levels).toHaveLength(5);
    }
  });

  it('listTracks() shapes pass TrackDtoSchema (no Zod parse errors)', async () => {
    await expect(service.listTracks()).resolves.not.toThrow();
  });

  it('getTrack() resolves for a valid track code', async () => {
    const track = await service.getTrack('TECH_FULLSTACK');
    expect(track.code).toBe('TECH_FULLSTACK');
    expect(track.levels).toHaveLength(5);
    expect(track.competencies.length).toBeGreaterThan(0);
  });

  it('getTrack() throws NotFoundException for an unknown track code', async () => {
    await expect(service.getTrack('NOT_A_REAL_TRACK')).rejects.toBeInstanceOf(NotFoundException);
  });
});
