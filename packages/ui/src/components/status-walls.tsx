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
    <main className="mx-auto max-w-lg p-8 mt-16">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">403</p>
          <CardTitle>This portal is not for your role</CardTitle>
          <CardDescription>
            You are signed in, but this microfrontend does not allow your account. Sign in with the
            matching role or return to the login screen.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
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
    </main>
  );
}

export function NotFoundWall({ homeHref }: { homeHref: string }): ReactNode {
  return (
    <main className="mx-auto max-w-lg p-8 mt-16">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">404</p>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            That URL is not part of this portal. Check the address or return to the home screen.
          </CardDescription>
        </CardHeader>
        <a href={homeHref}>
          <Button type="button">Back to home</Button>
        </a>
      </Card>
    </main>
  );
}
