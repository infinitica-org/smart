'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { isSmartApiError } from '@smart/api-client';
import { Alert } from '@smart/ui';
import BlackLogo from '@smart/ui/assets/images/Logos/WebP/BLACK LOGO@4x.webp';
import { api, redirectForRole, storeSession } from '../../../lib/api';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const executed = useRef(false);

  useEffect(() => {
    if (executed.current) return;
    executed.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const providerError = searchParams.get('error');

    if (providerError) {
      setError(`Authentication cancelled or failed: ${providerError}`);
      return;
    }
    if (!code || !state) {
      setError('Missing authentication parameters.');
      return;
    }

    void (async () => {
      try {
        const response = await api.auth.ssoCallback({ code, state });
        storeSession(response.accessToken);
        redirectForRole(response.user.role, response.accessToken, searchParams.get('returnTo'));
      } catch (err: unknown) {
        setError(
          isSmartApiError(err)
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to complete authentication.',
        );
      }
    })();
  }, [searchParams, router]);

  return (
    <section className="flex min-h-[60vh] w-full max-w-sm flex-col items-center justify-center px-4 py-12">
      <Image src={BlackLogo} alt="SMART Logo" width={160} height={42} className="mb-6 h-8 w-auto" />
      {error ? (
        <div className="w-full space-y-4">
          <Alert tone="danger" title={error} />
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full text-center text-sm font-semibold text-[#004c63] hover:underline"
          >
            Return to login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#004c63]/20 border-t-[#004c63]" />
          <p className="text-sm text-slate-600">Signing you in securely…</p>
        </div>
      )}
    </section>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <section className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#004c63]/20 border-t-[#004c63]" />
        </section>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
