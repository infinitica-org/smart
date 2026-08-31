'use client';

import { useEffect } from 'react';
import { buildLoginUrl } from '@smart/api-client';

const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export default function LoginPage() {
  useEffect(() => {
    const returnTo = `${window.location.origin}/dashboard`;
    window.location.replace(buildLoginUrl(authUrl, returnTo));
  }, []);

  return (
    <p className="p-8 text-sm text-[var(--text-muted)]" role="status">
      Redirecting to sign in…
    </p>
  );
}
