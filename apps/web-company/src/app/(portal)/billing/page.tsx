'use client';

import { useState } from 'react';
import { CreditCard, FileText, CheckCircle2 } from 'lucide-react';
import { Badge, PageHeader } from '../../../components/ui';
import type { Invoice } from '../../../lib/types';
import {
  card,
  pageStack,
  primaryButton,
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

export default function BillingPage() {
  const [invoices] = useState<Invoice[]>([]);

  return (
    <div className={pageStack}>
      <PageHeader
        title="Billing & Subscription"
        description="Manage your recruitment subscription, payment details, and invoices."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className={card}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={sectionTitle}>Current Plan</h2>
              <p className={sectionSubtitle}>Direct Campus Recruiting</p>
            </div>
            <Badge tone="green">Active</Badge>
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-[var(--ds-text)]">
            Standard Employer
          </p>
          <p className="text-[13px] text-[var(--ds-text-muted)]">
            Unlimited job postings · Verified talent search · Candidate defense reports
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" className={secondaryButton}>
              Manage subscription
            </button>
          </div>
        </section>

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
