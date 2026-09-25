import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useCompanyAccount } from './use-company-account';

const { companyAccount } = vi.hoisted(() => ({ companyAccount: vi.fn() }));

vi.mock('./api', () => ({ api: { auth: { companyAccount } } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCompanyAccount (S6-VV-139)', () => {
  it('surfaces an API failure as an error instead of a placeholder approved account', async () => {
    companyAccount.mockRejectedValue(new Error('This company is on hold.'));

    const { result } = renderHook(() => useCompanyAccount(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as Error).message).toBe('This company is on hold.');
  });

  it('returns the real account, including a non-approved status', async () => {
    companyAccount.mockResolvedValue({ companyName: 'Acme', companyVerificationStatus: 'PENDING' });

    const { result } = renderHook(() => useCompanyAccount(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ companyVerificationStatus: 'PENDING' });
  });
});
