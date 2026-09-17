import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileTopNav } from './ProfileTopNav';

afterEach(() => {
  cleanup();
});

describe('ProfileTopNav', () => {
  it('renders all profile sections in a horizontal top bar', () => {
    render(<ProfileTopNav activeSection="experience" onSelect={vi.fn()} />);

    const nav = screen.getByTestId('profile-top-nav');
    expect(nav.querySelector('ul')?.className).toMatch(/flex-nowrap/);

    expect(screen.queryByRole('button', { name: 'About' })).toBeNull();
    const sectionButtons = screen.getAllByRole('button');
    expect(sectionButtons[0]?.textContent).toContain('Education');
    expect(sectionButtons[1]?.textContent).toContain('Experience');
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
  });

  it('marks the active section and calls onSelect', () => {
    const onSelect = vi.fn();
    render(<ProfileTopNav activeSection="experience" onSelect={onSelect} />);

    expect(
      screen.getByRole('button', { name: 'Work Experience' }).getAttribute('aria-current'),
    ).toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'Education' }));
    expect(onSelect).toHaveBeenCalledWith('education');
  });

  it('uses typography for active state without pill backgrounds', () => {
    render(<ProfileTopNav activeSection="resume" onSelect={vi.fn()} />);

    const active = screen.getByRole('button', { name: 'Resume' });
    expect(active.className).toMatch(/font-semibold/);
    expect(active.className).toMatch(/text-\[var\(--ds-green\)\]/);
    expect(active.className).not.toMatch(/ds-nav-active-bg/);
    expect(active.className).not.toMatch(/rounded-lg/);

    const inactive = screen.getByRole('button', { name: 'Education' });
    expect(inactive.className).toMatch(/font-medium/);
    expect(inactive.className).not.toMatch(/ds-nav-active-bg/);
  });

  it('uses compact labels in the nav while keeping full accessible names', () => {
    render(<ProfileTopNav activeSection="experience" onSelect={vi.fn()} />);
    const experience = screen.getByRole('button', { name: 'Work Experience' });
    expect(experience.className).toMatch(/text-\[12px\]/);
    expect(experience.textContent).toContain('Experience');
    expect(screen.getByRole('button', { name: 'Professional Links' }).textContent).toContain(
      'Links',
    );
  });
});
