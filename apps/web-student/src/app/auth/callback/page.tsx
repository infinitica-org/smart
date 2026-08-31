'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell, Alert } from '@smart/ui';
import { storeAccessToken } from '@smart/api-client';
import { api } from '../../../lib/api';

function AuthCallbackComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  // Use ref to prevent double-execution in StrictMode
  const executed = useRef(false);

  useEffect(() => {
    if (executed.current) return;
    executed.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const err = searchParams.get('error');

    if (err) {
      setError(`Authentication cancelled or failed: ${err}`);
      return;
    }

    if (!code || !state) {
      setError('Missing authentication parameters.');
      return;
    }

    const processCallback = async () => {
      try {
        const response = await api.auth.ssoCallback({ code, state });

        // Store token in sessionStorage per architecture
        storeAccessToken(response.accessToken);

        // Redirect logic based on user state
        const user = response.user;

        if (!user.institutionId) {
          router.push('/institution-picker');
        } else if (!user.primaryTrack) {
          router.push('/enroll');
        } else {
          router.push('/dashboard');
        }
      } catch (e: unknown) {
        console.error(e);
        const msg = e instanceof Error ? e.message : 'Failed to complete authentication.';
        setError(msg);
      }
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <AppShell
      productName="SMART"
      title="Authenticating..."
      subtitle="Please wait while we securely sign you in."
    >
      <div className="mx-auto mt-12 max-w-md">
        {error ? (
          <div className="flex flex-col gap-4">
            <Alert tone="danger" title="Authentication Error">
              {error}
            </Alert>
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-blue-500 hover:underline"
            >
              Return to login
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <AppShell
          productName="SMART"
          title="Authenticating..."
          subtitle="Please wait while we securely sign you in."
        >
          <div className="mx-auto mt-12 max-w-md">
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
            </div>
          </div>
        </AppShell>
      }
    >
      <AuthCallbackComponent />
    </Suspense>
  );
}
