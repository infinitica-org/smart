'use client';

import { Button, Card, CardHeader, CardTitle, CardDescription, Badge, TierBadge } from '@smart/ui';

export default function DesignSystemPage() {
  return (
    <div className="p-8 space-y-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-4">SMART Design System</h1>
        <p className="text-[var(--text-muted)]">
          Testing all components and tokens, including Tailwind 4 default dark mode.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Buttons
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Badges
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <h3 className="text-lg font-medium mt-4">Tier Badges</h3>
        <div className="flex flex-wrap items-center gap-4">
          <TierBadge tier="GOLD" />
          <TierBadge tier="SILVER" />
          <TierBadge tier="BRONZE" />
          <TierBadge tier="BELOW_BRONZE" />
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <TierBadge tier="GOLD" showLabel />
          <TierBadge tier="SILVER" showLabel />
          <TierBadge tier="BRONZE" showLabel />
          <TierBadge tier="BELOW_BRONZE" showLabel />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
              <CardDescription>This is a description for the card component.</CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <p className="text-sm text-[var(--text-muted)]">
                Cards form the primary content boundaries in the application.
              </p>
            </div>
          </Card>

          <Card className="bg-[var(--surface-muted)]">
            <CardHeader>
              <CardTitle>Muted Card</CardTitle>
              <CardDescription>Using the surface-muted token.</CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button variant="outline" fullWidth>
                Action
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
