'use client';

import { useCompanyAccount } from '@/lib/use-company-account';
import {
  AccountErrorPanel,
  AccountLoadingPanel,
  OverviewHero,
} from '@/components/account-state-panel';

export default function CompanyOverviewPage() {
  const { data, isLoading, isError, error } = useCompanyAccount();

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Overview</h1>
        <AccountLoadingPanel />
      </div>
    );
  }

  if (isError || !data) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong while loading your account.';
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Overview</h1>
        <AccountErrorPanel message={message} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Overview</h1>
      <OverviewHero account={data} />
    </div>
  );
}
