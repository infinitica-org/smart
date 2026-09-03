'use client';

/** TPO hosts its own Institution Login; unauthenticated users stay on this portal. */
export function PortalAuthGate({ children }: { children: React.ReactNode }) {
  // --- MOCK BYPASS: Bypassing auth gate so you aren't kicked out ---
  return <>{children}</>;
}
