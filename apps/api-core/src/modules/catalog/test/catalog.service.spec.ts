import { describe, expect, it } from 'vitest';
import { SKILL_CATEGORY_IDS, SKILL_DEFINITIONS, SKILL_TAXONOMY_VERSION } from '@smart/contracts';
import { CatalogService } from '../catalog.service.js';

describe('CatalogService', () => {
  const service = new CatalogService({} as never);

  it('listSkillLibrary() returns skill@1 grouped by category', () => {
    const library = service.listSkillLibrary();
    expect(library.taxonomyVersion).toBe(SKILL_TAXONOMY_VERSION);
    expect(library.categories).toHaveLength(SKILL_CATEGORY_IDS.length);
    expect(library.categories.flatMap((category) => category.skills)).toHaveLength(
      SKILL_DEFINITIONS.length,
    );
  });
});
