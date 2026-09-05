import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DisplayGate, FullscreenGate } from './fullscreen-gate';

describe('FullscreenGate', () => {
  it('renders nothing when not blocked', () => {
    const { container } = render(<FullscreenGate blocked={false} onResume={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('blackouts the page with a warning and resume action', () => {
    const onResume = vi.fn();
    render(<FullscreenGate blocked onResume={onResume} />);
    expect(screen.getByRole('alertdialog')).toBeDefined();
    expect(screen.getByText(/integrity warning/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /return to fullscreen/i }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });
});

describe('DisplayGate', () => {
  it('renders nothing when not blocked', () => {
    const { container } = render(<DisplayGate blocked={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('flags an extra monitor and hides until it is gone', () => {
    render(<DisplayGate blocked />);
    expect(screen.getByText(/external display detected/i)).toBeDefined();
  });
});
