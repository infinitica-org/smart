import { describe, expect, it, vi } from 'vitest';
import { SKILL_TAXONOMY_VERSION } from '@smart/contracts';
import { CatalogController } from '../catalog.controller.js';
import type { CatalogService } from '../catalog.service.js';

describe('CatalogController', () => {
  it('listSkills() returns the skill@1 library from CatalogService', () => {
    const listSkillLibrary = vi.fn().mockReturnValue({
      taxonomyVersion: SKILL_TAXONOMY_VERSION,
      categories: [],
    });
    const controller = new CatalogController({ listSkillLibrary } as unknown as CatalogService);
    const library = controller.listSkills();
    expect(listSkillLibrary).toHaveBeenCalledOnce();
    expect(library.taxonomyVersion).toBe(SKILL_TAXONOMY_VERSION);
  });
});
