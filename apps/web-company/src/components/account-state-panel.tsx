'use client';

import type { CompanyPortalAccount } from '@smart/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { verificationStatusLabel } from '@/lib/verification-label';

export function AccountLoadingPanel() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <p className="sr-only">Loading company account…</p>
    </div>
  );
}

export function AccountErrorPanel({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Could not load account</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function AccountDetailsGrid({ account }: { account: CompanyPortalAccount }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Company', value: account.companyName ?? '—' },
    { label: 'Representative', value: account.fullName },
    { label: 'Work email', value: account.email },
    { label: 'Verification', value: verificationStatusLabel(account.companyVerificationStatus) },
    { label: 'Account', value: account.onboardingCompleted ? 'Ready' : 'Setup incomplete' },
  ];
  if (account.companyIndustry) {
    rows.push({ label: 'Industry', value: account.companyIndustry });
  }
  if (account.companyLocation) {
    rows.push({ label: 'Location', value: account.companyLocation });
  }
  if (account.companyWebsite) {
    rows.push({ label: 'Website', value: account.companyWebsite });
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg border border-border/70 bg-white px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OverviewHero({ account }: { account: CompanyPortalAccount }) {
  const approved = account.companyVerificationStatus === 'APPROVED';
  return (
    <Card className="border-border/70 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">
          {account.companyName ?? 'Company'}
        </CardTitle>
        <CardDescription>
          {approved
            ? 'Your company tenant is active. Recruitment workflows will appear here in a later release.'
            : 'Your company account is not fully active yet. Contact SMART support if this persists.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AccountDetailsGrid account={account} />
      </CardContent>
    </Card>
  );
}
