import { describe, expect, it, vi } from 'vitest';
import { SKILL_TAXONOMY_VERSION } from '@smart/contracts';
import { CatalogController } from '../catalog.controller.js';
import type { CatalogService } from '../catalog.service.js';
import type { EvidenceCatalogService } from '../../evidence/evidence-catalog.service.js';

describe('CatalogController', () => {
  it('list() returns taxonomy from CatalogService', async () => {
    const listTracks = vi.fn().mockResolvedValue([
      {
        code: 'TECH_FULLSTACK',
        competencies: [{ name: 'React', passThresholds: { BEGINNER: {} } }],
      },
    ]);
    const controller = new CatalogController(
      { listTracks } as unknown as CatalogService,
      {} as unknown as EvidenceCatalogService,
    );
    const tracks = await controller.list();
    expect(listTracks).toHaveBeenCalledOnce();
    expect(tracks[0]?.code).toBe('TECH_FULLSTACK');
  });

  it('listSeSkills() returns the inf-se-v1 library from CatalogService (S6-RM-13)', () => {
    const listSeSkillLibrary = vi.fn().mockReturnValue({
      taxonomyVersion: 'inf-se-v1@1',
      categories: [{ id: 'A', name: 'Programming & Software Development', skills: [] }],
    });
    const controller = new CatalogController(
      { listSeSkillLibrary } as unknown as CatalogService,
      {} as unknown as EvidenceCatalogService,
    );
    const library = controller.listSeSkills();
    expect(listSeSkillLibrary).toHaveBeenCalledOnce();
    expect(library.taxonomyVersion).toBe('inf-se-v1@1');
  });

  it('listSkills() returns the skill@1 library from CatalogService', () => {
    const listSkillLibrary = vi.fn().mockReturnValue({
      taxonomyVersion: SKILL_TAXONOMY_VERSION,
      categories: [],
    });
    const controller = new CatalogController(
      { listSkillLibrary } as unknown as CatalogService,
      {} as unknown as EvidenceCatalogService,
    );
    const library = controller.listSkills();
    expect(listSkillLibrary).toHaveBeenCalledOnce();
    expect(library.taxonomyVersion).toBe(SKILL_TAXONOMY_VERSION);
  });

  it('get() returns one track by code', async () => {
    const getTrack = vi.fn().mockResolvedValue({
      code: 'TECH_FULLSTACK',
      competencies: [{ name: 'React', passThresholds: { BEGINNER: { assessmentPass: 0.6 } } }],
    });
    const controller = new CatalogController(
      { getTrack } as unknown as CatalogService,
      {} as unknown as EvidenceCatalogService,
    );
    const track = await controller.get('TECH_FULLSTACK');
    expect(getTrack).toHaveBeenCalledWith('TECH_FULLSTACK');
    expect(track.competencies[0]?.passThresholds?.BEGINNER.assessmentPass).toBe(0.6);
  });
});
