import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

const me = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => <span>{props.alt}</span>,
}));

vi.mock('@/lib/api', () => ({
  api: {
    auth: { me: (...args: unknown[]) => me(...args) },
  },
}));

function renderNav() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Navbar />
    </QueryClientProvider>,
  );
}

describe('Navbar identity', () => {
  beforeEach(() => {
    me.mockReset();
    me.mockResolvedValue({
      fullName: 'Ada Lovelace',
      role: 'STUDENT',
      onboardingCompleted: true,
    });
  });

  it('shows initials from GET /users/me fullName, not a fixture name', async () => {
    renderNav();
    await waitFor(() => expect(screen.getByLabelText('Signed in as Ada Lovelace')).toBeTruthy());
    expect(screen.getByLabelText('Signed in as Ada Lovelace').textContent).toBe('AL');
    expect(screen.queryByText('SV')).toBeNull();
  });
});
