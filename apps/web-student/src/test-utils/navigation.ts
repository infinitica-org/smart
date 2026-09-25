import { useSyncExternalStore } from 'react';
import { vi } from 'vitest';

/**
 * A tiny stand-in for next/navigation whose search params live in a store, so a component that
 * reads the URL re-renders when it calls router.replace (the real behaviour the Jobs page relies on).
 */
let search = '';
const listeners = new Set<() => void>();

export const nav = {
  replace: vi.fn<(url: string) => void>(),
  push: vi.fn<(url: string) => void>(),
  params: {} as Record<string, string>,
};

export function setSearch(next: string): void {
  search = next.replace(/^\?/, '');
  listeners.forEach((listener) => listener());
}

export function currentSearch(): string {
  return search;
}

export function resetNavigation(initialSearch = ''): void {
  nav.replace.mockClear();
  nav.push.mockClear();
  nav.params = {};
  setSearch(initialSearch);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const navigationModule = {
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        subscribe,
        () => search,
        () => search,
      ),
    ),
  useRouter: () => ({
    replace: (url: string) => {
      nav.replace(url);
      setSearch(url.split('?')[1] ?? '');
    },
    push: (url: string) => nav.push(url),
  }),
  useParams: () => nav.params,
};
