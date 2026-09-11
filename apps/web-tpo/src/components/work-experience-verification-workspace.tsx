'use client';

import { useEffect, useState } from 'react';
import type { WorkExperienceOpsDashboardItemDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { AlertCircle, Briefcase, Clock, RefreshCw } from 'lucide-react';
import { Badge, Card } from '@smart/ui';
import { api } from '../lib/api';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

function statusTone(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'VERIFIED':
      return 'secondary';
    case 'PENDING_EMPLOYER':
      return 'outline';
    case 'REJECTED':
    case 'EXPIRED':
    case 'VOIDED':
      return 'destructive';
    default:
      return 'default';
  }
}

export function WorkExperienceVerificationWorkspace() {
  const [items, setItems] = useState<WorkExperienceOpsDashboardItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.users.getWorkExperienceOpsDashboard();
      setItems(
        ([...rows] as WorkExperienceOpsDashboardItemDto[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    } catch (err) {
      setError(errorMessage(err, 'Failed to load work experience verification queue.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-[#004C63]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3 text-red-700">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load verification queue</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-3 text-sm font-semibold underline"
            >
              Retry
            </button>
          </div>
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <Briefcase className="mx-auto size-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700">
          No work experience verifications in progress
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Candidate verification rows will appear here once students submit claims.
        </p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Candidate',
                'Company',
                'Status',
                'Current step',
                'Email state',
                'Time remaining',
                'Next action',
                'Flags',
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.experienceId} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{item.candidateName}</div>
                  <div className="text-xs text-slate-500">{item.candidateEmail}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{item.companyName}</div>
                  <div className="text-xs text-slate-500">{item.role}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusTone(item.status)}>{item.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">{item.currentStep}</td>
                <td className="px-4 py-3 text-slate-700">{item.emailState}</td>
                <td className="px-4 py-3 text-slate-700">
                  {item.timeRemainingHours > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {item.timeRemainingHours}h
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-slate-600">{item.nextAction}</td>
                <td className="px-4 py-3">
                  {item.hasFlaggedDocuments ? (
                    <Badge variant="outline">{item.flaggedDocumentCount} flagged</Badge>
                  ) : (
                    <span className="text-xs text-slate-400">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
