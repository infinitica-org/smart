import { describe, expect, it } from 'vitest';

import {
  mergeProjectTaggedMetadata,
  projectTaggedSkillClaimMetadata,
  skillClaimDeclareOrigin,
} from './skill-claim-origin.js';

describe('skillClaimDeclareOrigin', () => {
  it('reads PROJECT_TAGGED from metadata', () => {
    expect(
      skillClaimDeclareOrigin({
        source: 'MANUAL',
        sourceMetadata: projectTaggedSkillClaimMetadata('proj-1'),
      }),
    ).toBe('PROJECT_TAGGED');
  });

  it('maps GITHUB_DERIVED source column', () => {
    expect(skillClaimDeclareOrigin({ source: 'GITHUB_DERIVED', sourceMetadata: null })).toBe(
      'GITHUB_DERIVED',
    );
  });

  it('merges project ids without dropping existing metadata', () => {
    const merged = mergeProjectTaggedMetadata(projectTaggedSkillClaimMetadata('p1'), 'p2');
    expect(merged.projectIds).toEqual(['p1', 'p2']);
    expect(merged.declareOrigin).toBe('PROJECT_TAGGED');
  });
});
