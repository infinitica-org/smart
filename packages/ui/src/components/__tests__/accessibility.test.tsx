import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingState, ErrorState, SuccessState } from '../common-states';
import { Input } from '../input';
import { Breadcrumbs } from '../breadcrumbs';
import { UserMenu } from '../user-menu';
import { Button } from '../button';

describe('Accessibility & WCAG Compliance Unit Tests', () => {
  it('LoadingState exposes role="status" and aria-live="polite"', () => {
    const { container } = render(<LoadingState message="Processing request..." />);
    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Processing request...')).toBeDefined();
  });

  it('ErrorState exposes role="alert" and aria-live="assertive"', () => {
    const { container } = render(
      <ErrorState title="Validation Error" message="Invalid email domain" />,
    );
    const alertEl = container.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.getAttribute('aria-live')).toBe('assertive');
    expect(screen.getByText('Invalid email domain')).toBeDefined();
  });

  it('SuccessState exposes role="status" and aria-live="polite"', () => {
    const { container } = render(<SuccessState title="Success" description="Profile updated" />);
    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.getAttribute('aria-live')).toBe('polite');
  });

  it('Input associates label with htmlFor, aria-invalid, and aria-describedby for errors', () => {
    render(<Input label="Work Email" error="Email is required" name="email" />);
    const input = screen.getByLabelText('Work Email') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorId = input.getAttribute('aria-describedby');
    expect(errorId).toBe('email-error');
    const errorEl = errorId ? document.getElementById(errorId) : null;
    expect(errorEl?.textContent).toBe('Email is required');
    expect(errorEl?.getAttribute('role')).toBe('alert');
  });

  it('Button exposes aria-disabled and aria-busy when loading or disabled', () => {
    render(<Button isLoading>Submit</Button>);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('Breadcrumbs renders semantic nav, ol, li elements and aria-current="page"', () => {
    render(
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Security' }]} />,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeDefined();
    const activeItem = screen.getByText('Security');
    expect(activeItem.getAttribute('aria-current')).toBe('page');
  });

  it('UserMenu closes on Escape key press', () => {
    render(<UserMenu user={{ name: 'Sathesh V', email: 'sathesh@smart.edu' }} />);
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);
    expect(screen.getByRole('menu')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
