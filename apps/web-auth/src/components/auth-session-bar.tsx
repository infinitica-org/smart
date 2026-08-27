'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@smart/api-client';
import { SignOutButton } from '@smart/ui';
import { signOut } from '../lib/auth';

export function AuthSessionBar() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(getAccessToken() !== null);
  }, []);

  if (!signedIn) return null;

  return (
    <div className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl justify-end px-6 py-2">
        <SignOutButton onSignOut={signOut} />
      </div>
    </div>
  );
}
