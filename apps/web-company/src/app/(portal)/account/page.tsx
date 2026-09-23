'use client';

import { useCompanyAccount } from '@/lib/use-company-account';
import {
  AccountDetailsGrid,
  AccountErrorPanel,
  AccountLoadingPanel,
} from '@/components/account-state-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';

export default function CompanyAccountPage() {
  const { data, isLoading, isError, error } = useCompanyAccount();

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Account</h1>
        <AccountLoadingPanel />
      </div>
    );
  }

  if (isError || !data) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong while loading your account.';
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Account</h1>
        <AccountErrorPanel message={message} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Account</h1>
      <Card className="border-border/70 bg-white">
        <CardHeader>
          <CardTitle>Signed-in representative</CardTitle>
          <CardDescription>
            Tenant context is bound to your SMART account. Company identity cannot be changed from
            the browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountDetailsGrid account={data} />
        </CardContent>
      </Card>
    </div>
  );
}
