import { describe, expect, it, vi } from 'vitest';
import { CatalogController } from '../catalog.controller.js';
import type { CatalogService } from '../catalog.service.js';

describe('CatalogController', () => {
  it('list() returns taxonomy from CatalogService', async () => {
    const listTracks = vi.fn().mockResolvedValue([
      {
        code: 'TECH_FULLSTACK',
        competencies: [{ name: 'React', passThresholds: { BEGINNER: {} } }],
      },
    ]);
    const controller = new CatalogController({ listTracks } as unknown as CatalogService);
    const tracks = await controller.list();
    expect(listTracks).toHaveBeenCalledOnce();
    expect(tracks[0]?.code).toBe('TECH_FULLSTACK');
  });

  it('get() returns one track by code', async () => {
    const getTrack = vi.fn().mockResolvedValue({
      code: 'TECH_FULLSTACK',
      competencies: [{ name: 'React', passThresholds: { BEGINNER: { assessmentPass: 0.6 } } }],
    });
    const controller = new CatalogController({ getTrack } as unknown as CatalogService);
    const track = await controller.get('TECH_FULLSTACK');
    expect(getTrack).toHaveBeenCalledWith('TECH_FULLSTACK');
    expect(track.competencies[0]?.passThresholds?.BEGINNER.assessmentPass).toBe(0.6);
  });
});
