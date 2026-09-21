import { describe, expect, it } from 'vitest';

import { buildSkillLibraryResponse } from '@smart/contracts';

import { flattenSkillLibrary, stackLabelFromSkillCodes } from './project-form-skills';

describe('project-form-skills', () => {
  it('flattens the catalog skill library for pickers', () => {
    const rows = flattenSkillLibrary(buildSkillLibraryResponse());
    expect(rows.length).toBeGreaterThan(40);
    expect(rows.some((row) => row.code === 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT')).toBe(true);
  });

  it('builds stack labels from taxonomy codes', () => {
    const label = stackLabelFromSkillCodes(['PYTHON_APPLICATION_BACKEND_DEVELOPMENT']);
    expect(label.length).toBeGreaterThan(3);
  });
});
