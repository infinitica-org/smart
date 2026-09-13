import { describe, expect, it } from 'vitest';
import {
  INF_SE_V1_TAXONOMY_VERSION,
  SE_SKILL_DEFINITIONS,
  SKILL_CATEGORY_IDS,
  SKILL_DEFINITIONS,
  SKILL_TAXONOMY_VERSION,
} from '@smart/contracts';
import { CatalogService } from '../catalog.service.js';

describe('CatalogService', () => {
  const service = new CatalogService({} as never);

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

  it('listSkillLibrary() returns skill@1 grouped by category', () => {
    const library = service.listSkillLibrary();
    expect(library.taxonomyVersion).toBe(SKILL_TAXONOMY_VERSION);
    expect(library.categories).toHaveLength(SKILL_CATEGORY_IDS.length);
    expect(library.categories.flatMap((category) => category.skills)).toHaveLength(
      SKILL_DEFINITIONS.length,
    );
  });
});
