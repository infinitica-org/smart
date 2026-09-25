'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, FileText, RefreshCw, AlertCircle, Layers } from 'lucide-react';
import type { SubscriptionPlanDto } from '@smart/contracts';
import { Badge, PageHeader } from '../../../components/ui';
import type { Invoice } from '../../../lib/types';
import { api, formatApiError } from '../../../lib/api';
import {
  card,
  pageStack,
  secondaryButton,
  sectionSubtitle,
  sectionTitle,
  table,
  tableCell,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableShell,
} from '../../../lib/ui';

function formatPrice(priceInr: number | null, isCustomPrice: boolean): string {
  if (isCustomPrice || priceInr === null) return 'Custom';
  if (priceInr === 0) return '₹0 / Free';
  return `₹${priceInr.toLocaleString('en-IN')}`;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices] = useState<Invoice[]>([]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.onboarding.listAvailablePlans();
      setPlans(data);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load available plans. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className={pageStack}>
      <PageHeader
        title="Billing & Subscription"
        description="Manage your recruitment subscription, available plans, payment details, and invoices."
      />

      {/* Available Plans Catalog Section */}
      <section className={card}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={sectionTitle}>Available Employer Plans</h2>
            <p className={sectionSubtitle}>
              Explore certified recruitment tiers tailored for campus talent engagement
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPlans}
            disabled={loading}
            className={`${secondaryButton} inline-flex items-center gap-1.5 text-xs`}
            title="Refresh plan catalog"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-[var(--ds-border)] p-4 space-y-3 bg-[var(--ds-surface-muted)]"
              >
                <div className="h-4 w-24 rounded bg-[var(--ds-border)]" />
                <div className="h-7 w-20 rounded bg-[var(--ds-border)]" />
                <div className="h-3 w-32 rounded bg-[var(--ds-border)]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <AlertCircle className="size-8 text-red-500 mb-2" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={fetchPlans}
              className="mt-3 text-xs font-semibold text-[var(--co-teal)] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ds-border)] p-8 text-center bg-[var(--ds-surface-muted)]">
            <Layers className="size-8 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-[var(--ds-text)]">No plans available</p>
            <p className="text-xs text-[var(--ds-text-muted)] mt-1">
              Check back later or contact platform support.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.planId}
                className="flex flex-col justify-between rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-5 transition-shadow hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold tracking-wider text-[var(--ds-text-muted)] uppercase">
                      {plan.code}
                    </span>
                    {plan.isCustomPrice && <Badge tone="neutral">Custom</Badge>}
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold text-[var(--ds-text)]">
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight text-[var(--ds-text)]">
                      {formatPrice(plan.priceInr, plan.isCustomPrice)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--ds-border)] flex items-center justify-between text-xs text-[var(--ds-text-muted)]">
                  <span>Capacity</span>
                  <span className="font-medium text-[var(--ds-text)]">
                    {plan.candidateCapacity ? `${plan.candidateCapacity} Candidates` : 'Unlimited'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment Method & Invoices Sections */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className={sectionTitle}>Payment Method</h2>
          <p className={sectionSubtitle}>Connected via payment provider</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)]">
              <CreditCard className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--ds-text)]">Corporate Billing</p>
              <p className="text-xs text-[var(--ds-text-muted)]">Invoice on file</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-5 text-[13px] font-semibold text-[var(--co-teal)] hover:underline"
          >
            Update payment method
          </button>
        </section>

        <section className={card}>
          <h2 className={sectionTitle}>Subscription Status</h2>
          <p className={sectionSubtitle}>Account licensing status</p>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ds-text)]">Active Membership</p>
              <p className="text-xs text-[var(--ds-text-muted)]">Authorized Employer Account</p>
            </div>
            <Badge tone="green">Active</Badge>
          </div>
        </section>
      </div>

      <section>
        <h2 className={sectionTitle}>Invoices</h2>
        <p className={sectionSubtitle}>Historical receipts and transaction records</p>

        {invoices.length === 0 ? (
          <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-6 py-10 text-center">
            <FileText className="size-8 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-[var(--ds-text)]">No invoices generated yet</p>
            <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
              Invoices will automatically show here once your subscription cycles or fees are
              billed.
            </p>
          </div>
        ) : (
          <div className={`${tableShell} mt-3`}>
            <table className={table}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Invoice</th>
                  <th className={tableHeadCell}>Date</th>
                  <th className={tableHeadCell}>Amount</th>
                  <th className={tableHeadCell}>Status</th>
                  <th className={`${tableHeadCell} text-right`}>&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className={tableRow}>
                    <td className={`${tableCell} font-semibold text-[var(--ds-text)]`}>
                      {invoice.id}
                    </td>
                    <td className={tableCell}>{invoice.date}</td>
                    <td className={tableCell}>{invoice.amount}</td>
                    <td className={tableCell}>
                      <Badge tone="green">{invoice.status}</Badge>
                    </td>
                    <td className={`${tableCell} text-right`}>
                      <button
                        type="button"
                        className="text-[13px] font-semibold text-[var(--co-teal)] hover:underline"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
