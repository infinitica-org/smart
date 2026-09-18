import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboarding } from './use-onboarding';

const getOnboarding = vi.fn();

vi.mock('./api', () => ({
  api: {
    users: {
      getOnboarding: (...args: unknown[]) => getOnboarding(...args),
    },
  },
}));

const sharedClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: sharedClient }, children);
}

describe('useOnboarding', () => {
  beforeEach(() => {
    sharedClient.clear();
    getOnboarding.mockReset();
    getOnboarding.mockResolvedValue({
      profile: { about: 'Cached profile' },
      draft: null,
      onboardingCompleted: true,
    });
  });

  it('deduplicates concurrent onboarding fetches through react query', async () => {
    const first = renderHook(() => useOnboarding(), { wrapper });
    const second = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(getOnboarding).toHaveBeenCalledTimes(1);
    expect(first.result.current.data?.profile?.about).toBe('Cached profile');
    expect(second.result.current.data?.profile?.about).toBe('Cached profile');
  });
});
