'use client';

import type { ReactNode } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';

export function ForbiddenWall({
  homeHref,
  loginHref,
  onSignOut,
}: {
  homeHref?: string;
  loginHref: string;
  onSignOut?: () => void | Promise<void>;
}): ReactNode {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <LockIcon />
            </div>
            <p className="mb-1 text-xs font-medium text-brand-600">403</p>
            <CardTitle>This portal is not for your role</CardTitle>
            <CardDescription>
              You are signed in, but this microfrontend does not allow your account. Sign in with
              the matching role or return to the login screen.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-3 px-6 pb-6 pt-2">
            {homeHref ? (
              <a href={homeHref}>
                <Button variant="secondary" type="button">
                  Go to your portal
                </Button>
              </a>
            ) : null}
            <a href={loginHref}>
              <Button variant="outline" type="button">
                Sign in again
              </Button>
            </a>
            {onSignOut ? (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  void onSignOut();
                }}
              >
                Sign out
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </main>
  );
}

export function NotFoundWall({ homeHref }: { homeHref: string }): ReactNode {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <CompassIcon />
            </div>
            <p className="mb-1 text-xs font-medium text-brand-600">404</p>
            <CardTitle>Page not found</CardTitle>
            <CardDescription>
              That URL is not part of this portal. Check the address or return to the home screen.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 pt-2">
            <a href={homeHref}>
              <Button type="button">Back to home</Button>
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2 5-3 1 2-5 3-1Z" />
    </svg>
  );
}
