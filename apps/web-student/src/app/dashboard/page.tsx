import {
  AppShell,
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  LevelStepper,
  TierBadge,
} from '@smart/ui';

export default function DashboardPage() {
  return (
    <AppShell
      productName="SMART · Candidate"
      title="Dashboard"
      subtitle="Track enrolment, L1-L5 player, results."
      nav={<span className="text-sm text-[var(--text-muted)]">Student portal</span>}
    >
      <div className="grid gap-6">
        <Alert tone="info" title="Welcome">
          Your account is ready. Assessment and level content will appear here as features ship.
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>Certification model</CardTitle>
            <CardDescription>
              Gold / Silver / Bronze is criterion-referenced, never a curve.
            </CardDescription>
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
            <CardDescription>
              A level unlocks only at Bronze or above on the level below.
            </CardDescription>
          </CardHeader>
          <LevelStepper unlockedThrough={1} current={1} />
        </Card>
        <Button>Continue</Button>
      </div>
    </AppShell>
  );
}
