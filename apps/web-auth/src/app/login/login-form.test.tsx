import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartApiError } from '@smart/api-client';
import { api, storeSession } from '../../lib/api';
import { LoginForm } from './login-form';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('../../lib/api', () => ({
  api: { auth: { login: vi.fn(), resendEmailVerification: vi.fn() } },
  storeSession: vi.fn(),
  redirectForRole: vi.fn(),
}));

describe('LoginForm with an unverified email', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('explains why sign-in failed and offers a new verification link', async () => {
    vi.mocked(api.auth.login).mockRejectedValue(
      new SmartApiError({
        error: 'email_not_verified',
        message: 'Verify your email before signing in.',
        statusCode: 403,
      }),
    );
    vi.mocked(api.auth.resendEmailVerification).mockResolvedValue(undefined);

    const { container } = render(<LoginForm />);
    const email = container.querySelector('input[type="email"]');
    const password = container.querySelector('input[type="password"]');
    if (!email || !password) throw new Error('login inputs missing');
    fireEvent.change(email, { target: { value: 'jane@psgtech.ac.in' } });
    fireEvent.change(password, { target: { value: 'Password123!' } });
    const form = email.closest('form');
    if (!form) throw new Error('form missing');
    fireEvent.submit(form);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Verify your email before signing in.',
    );
    expect(storeSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Send a new verification link/i }));
    await waitFor(() =>
      expect(api.auth.resendEmailVerification).toHaveBeenCalledWith({
        email: 'jane@psgtech.ac.in',
      }),
    );
  });
});
