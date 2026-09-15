/** Same-origin paths on the auth app (e.g. `/change-password`), not portal URLs. */
export function authAppReturnToPath(returnTo: string | null): string | null {
  if (!returnTo) return null;
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;
  return returnTo;
}
