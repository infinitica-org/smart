import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TpoSidebar } from './tpo-sidebar';

const navState = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}));

function renderSidebar(mobileOpen = false) {
  const onMobileOpenChange = vi.fn();
  const view = render(
    <TpoSidebar mobileOpen={mobileOpen} onMobileOpenChange={onMobileOpenChange} />,
  );
  return { ...view, onMobileOpenChange };
}

beforeEach(() => {
  navState.pathname = '/';
});

afterEach(() => {
  cleanup();
});

describe('TpoSidebar brand', () => {
  it('shows the SMART logo linking home', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'SMART home' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('img', { name: 'SMART logo' })).toBeDefined();
  });
});

describe('TpoSidebar navigation', () => {
  it.each([
    ['Dashboard', '/'],
    ['Students', '/students'],
    ['Whitelist', '/whitelist'],
    ['Employers', '/companies'],
    ['Reports', '/reports'],
  ])('links %s to %s', (name, href) => {
    renderSidebar();
    expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
  });

  it.each([
    ['/', 'Dashboard'],
    ['/students', 'Students'],
    ['/openings/create', 'Employers'],
  ] as const)('marks %s as current for %s', (pathname, label) => {
    navState.pathname = pathname;
    renderSidebar();
    expect(screen.getByRole('link', { name: label }).getAttribute('aria-current')).toBe('page');
  });

  it('calls onMobileOpenChange when a link is clicked', () => {
    const { onMobileOpenChange } = renderSidebar(true);
    fireEvent.click(screen.getByRole('link', { name: 'Students' }));
    expect(onMobileOpenChange).toHaveBeenCalledWith(false);
  });
});
