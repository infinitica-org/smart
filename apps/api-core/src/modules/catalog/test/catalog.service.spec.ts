import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  INF_SE_V1_TAXONOMY_VERSION,
  SE_SKILL_DEFINITIONS,
  SKILL_DEFINITIONS,
  SKILL_TAXONOMY_VERSION,
  TRACK_DEFINITIONS,
} from '@smart/contracts';
import { CatalogService } from '../catalog.service.js';

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

  it('listSeSkillLibrary() returns inf-se-v1 grouped by category (S6-RM-13)', () => {
    const library = service.listSeSkillLibrary();
    expect(library.taxonomyVersion).toBe(INF_SE_V1_TAXONOMY_VERSION);
    expect(library.categories).toHaveLength(9);
    expect(library.categories.flatMap((category) => category.skills)).toHaveLength(
      SE_SKILL_DEFINITIONS.length,
    );
    expect(library.categories[0]?.skills[0]).toMatchObject({
      code: expect.stringMatching(/^SE_|^TOOL_/),
      categoryId: expect.any(String),
      tagType: expect.stringMatching(/SKILL|TOOL/),
    });
  });

  it('listSkillLibrary() returns the frozen v0.9 INF-05 skill-set (SK-T01)', () => {
    const library = service.listSkillLibrary();
    expect(library.taxonomyVersion).toBe(SKILL_TAXONOMY_VERSION);
    expect(library.skills).toHaveLength(SKILL_DEFINITIONS.length);
    expect(library.skills[0]).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      domain: 'SOFTWARE_IT',
      stream: expect.any(String),
    });
  });

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

  it('TECH_FULLSTACK competencies each expose PRD 7.3 pass thresholds (INF-05)', async () => {
    const track = await service.getTrack('TECH_FULLSTACK');
    const fullstack = TRACK_DEFINITIONS.find((definition) => definition.code === 'TECH_FULLSTACK');
    const expectedTopics = fullstack?.domains.flatMap((domain) => domain.topics);
    expect(expectedTopics).toBeDefined();
    expect(track.competencies.length).toBeGreaterThanOrEqual(15);
    expect(track.competencies.map((competency) => competency.name)).toEqual(expectedTopics);
    for (const competency of track.competencies) {
      expect(competency.passThresholds).toBeDefined();
      expect(competency.passThresholds?.BEGINNER).toEqual({
        assessmentPass: 0.6,
        interviewPass: null,
        assessmentWeight: 1,
      });
      expect(competency.passThresholds?.INTERMEDIATE.interviewPass).toBe(0.6);
      expect(competency.passThresholds?.ADVANCED.interviewPass).toBe(0.6);
      expect(competency.passThresholds?.INTERMEDIATE.assessmentWeight).toBe(0.4);
      expect(competency.passThresholds?.ADVANCED.assessmentWeight).toBe(0.4);
    }
  });

  it('listTracks() attaches pass thresholds on every competency', async () => {
    const tracks = await service.listTracks();
    for (const track of tracks) {
      expect(track.competencies.length).toBeGreaterThan(0);
      for (const competency of track.competencies) {
        expect(competency.passThresholds).toBeDefined();
      }
    }
  });

  it('attaches pass thresholds when the track is loaded from the database', async () => {
    const dbRow = {
      id: '11111111-1111-4111-8111-111111111111',
      code: 'TECH_FULLSTACK',
      name: 'Full Stack Developer',
      category: 'TECH' as const,
      launchStatus: 'AVAILABLE_NEW' as const,
      calibrationStatus: 'NOT_CALIBRATED' as const,
      foundationWeight: 0,
      capstoneBrief: 'capstone',
      competencies: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          domainCode: 'A' as const,
          name: 'React',
          subDomain: 'Frontend Engineering',
          realWorldWeight: 0.055,
          assessedAtLevels: [1, 2],
        },
      ],
      levels: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          levelNumber: 1,
          name: 'MCQ',
          format: 'MCQ' as const,
          durationMinutes: 45,
          itemCount: 0,
        },
      ],
    };
    const dbUp = {
      track: {
        findMany: async () => [dbRow],
        findUnique: async () => dbRow,
      },
    } as never;
    const fromDb = new CatalogService(dbUp);
    const track = await fromDb.getTrack('TECH_FULLSTACK');
    expect(track.competencies[0]?.name).toBe('React');
    expect(track.competencies[0]?.passThresholds?.BEGINNER.assessmentPass).toBe(0.6);
  });
});
