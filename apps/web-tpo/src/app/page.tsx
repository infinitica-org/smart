import { AppShell, Alert, Button, Card, CardDescription, CardHeader, CardTitle, LevelStepper, TierBadge } from '@smart/ui';

export default function Page() {
  return (
    <AppShell
      productName="SMART · Placement"
      title="TPO console"
      subtitle="Cohort readiness, JD ingest, shortlists."
      nav={<span className="text-sm text-[var(--text-muted)]">Owner: Satheswaran V</span>}
    >
      <div className="grid gap-6">
        <Alert tone="info" title="Sprint 0 scaffold">
          This portal is wired to @smart/ui and @smart/api-client. Feature work lands against
          @smart/contracts — do not invent local DTO shapes.
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>Certification model</CardTitle>
            <CardDescription>Gold / Silver / Bronze is criterion-referenced, never a curve.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            <TierBadge tier="GOLD" showLabel />
            <TierBadge tier="SILVER" showLabel />
            <TierBadge tier="BRONZE" showLabel />
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Level progression</CardTitle>
            <CardDescription>A level unlocks only at Bronze or above on the level below.</CardDescription>
          </CardHeader>
          <LevelStepper unlockedThrough={1} current={1} />
        </Card>
        <Button>Continue</Button>
      </div>
    </AppShell>
  );
}
