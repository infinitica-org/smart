'use client';

import type { ReactNode } from 'react';

/**
 * Candidate console is dark-teal locked (CN-T05).
 * Avoid next-themes ThemeProvider — it injects a <script> that React 19
 * warns about ("Encountered a script tag while rendering React component").
 * Root layout sets `class="dark"` instead.
 */
export function Providers({ children }: { children: ReactNode }) {
  return children;
}
