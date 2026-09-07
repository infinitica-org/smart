import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkillVerifyLoading } from './skill-verify-loading';

describe('SkillVerifyLoading', () => {
  it('shows a generating card instead of a bare caption', () => {
    render(<SkillVerifyLoading generating error={null} />);
    expect(screen.getByText('Building your assessment')).toBeTruthy();
    expect(screen.getByText(/writing questions/i)).toBeTruthy();
  });
});
