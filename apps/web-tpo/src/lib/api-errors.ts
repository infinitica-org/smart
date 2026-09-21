import { isSmartApiError } from '@smart/api-client';

/** User-facing API error text for TPO placement pages. */
export function tpoApiErrorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught)) {
    if (caught.message === 'An unexpected error occurred.') {
      return (
        `${caught.message} The API may be out of date — run ` +
        '`pnpm --filter @smart/api-core exec prisma migrate deploy`, then `pnpm --filter @smart/api-core exec prisma generate`, and restart api-core.'
      );
    }
    return caught.message;
  }
  if (caught instanceof Error) return caught.message;
  return fallback;
}
