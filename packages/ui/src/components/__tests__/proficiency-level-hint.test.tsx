import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProficiencyLevelHint } from '../proficiency-level-hint';

describe('ProficiencyLevelHint', () => {
  it('exposes an accessible trigger for the level legend', () => {
    render(<ProficiencyLevelHint />);
    expect(
      screen.getByRole('button', { name: /what do verified level numbers mean/i }),
    ).toBeDefined();
  });
});
