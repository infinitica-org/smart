import { isSmartApiError, SmartContractViolationError, SmartNetworkError } from '@smart/api-client';

export function formatLoginError(error: unknown): string {
  if (error instanceof SmartNetworkError) {
    return 'Cannot reach the SMART API. Start api-core (pnpm dev:api or pnpm dev) and ensure Docker Postgres/Redis are up.';
  }
  if (error instanceof SmartContractViolationError) {
    return 'Sign-in succeeded but the response did not match the API contract. Rebuild @smart/contracts and restart the API.';
  }
  if (isSmartApiError(error)) {
    if (error.code === 'unauthorized') {
      return 'Email or password is incorrect.';
    }
    return error.message;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Login failed. Try again.';
}
