import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TpoTopbar } from './tpo-topbar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('../lib/api', () => ({
  api: {
    auth: { me: vi.fn().mockResolvedValue({ fullName: 'Pilot TPO', role: 'INSTITUTION_ADMIN' }) },
    onboarding: { listTpoStudents: vi.fn().mockResolvedValue([]) },
  },
  openingsApi: { list: vi.fn().mockResolvedValue({ openings: [] }) },
}));

afterEach(() => {
  cleanup();
});

describe('TpoTopbar', () => {
  it('has breadcrumb navigation and profile menu', () => {
    render(<TpoTopbar onOpenMobileNav={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Support' })).toBeDefined();
  });

  it('opens mobile nav via menu button', () => {
    const onOpen = vi.fn();
    render(<TpoTopbar onOpenMobileNav={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('opens profile menu with My school and Sign out', () => {
    render(<TpoTopbar onOpenMobileNav={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Pilot TPO account menu/i }));
    expect(screen.getByRole('button', { name: 'My school' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign out/i })).toBeDefined();
  });
});
