import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { nextWaitGameCell, SkillVerifyWaitGame } from './skill-verify-wait-game';

describe('nextWaitGameCell', () => {
  it('never returns the current cell', () => {
    expect(nextWaitGameCell(4, () => 4 / 9)).not.toBe(4);
    expect(nextWaitGameCell(0, () => 0)).toBe(1);
  });
});

describe('SkillVerifyWaitGame', () => {
  it('scores a hit on the lit square', () => {
    render(<SkillVerifyWaitGame />);
    fireEvent.click(screen.getByRole('button', { name: /hit square 5/i }));
    expect(screen.getByTestId('wait-game-score').textContent).toBe('1');
  });

  it('does not score a miss', () => {
    render(<SkillVerifyWaitGame />);
    fireEvent.click(screen.getByRole('button', { name: /^square 1$/i }));
    expect(screen.getByTestId('wait-game-score').textContent).toBe('0');
  });
});
