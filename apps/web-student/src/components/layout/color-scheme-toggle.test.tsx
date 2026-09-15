import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorSchemeToggle } from './color-scheme-toggle';

const setTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme,
  }),
}));

describe('ColorSchemeToggle', () => {
  beforeEach(() => {
    setTheme.mockClear();
  });

  it('switches to dark mode when clicked in light mode', () => {
    render(<ColorSchemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
