'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import type { ApplicationDto, AtsStage } from '@smart/contracts';
import { Alert, Card, Button } from '@smart/ui';
import { Search, Filter, Shield, Clock, Video, Building2, Ban, XCircle } from 'lucide-react';
import { applicationsApi, openingsApi } from '../../../lib/api';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

type OpportunityRow = {
  application: ApplicationDto;
  companyName: string;
  roleTitle: string;
};

const STAGE_FILTERS: readonly (AtsStage | 'ALL')[] = [
  'ALL',
  'APPLIED',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

function stageBadge(stage: AtsStage) {
  switch (stage) {
    case 'APPLIED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" /> Applied
        </span>
      );
    case 'SHORTLISTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Shield className="w-3.5 h-3.5 text-sky-600" /> Shortlisted
        </span>
      );
    case 'INTERVIEW':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Video className="w-3.5 h-3.5 text-indigo-600" /> Interview
        </span>
      );
    case 'OFFER':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Shield className="w-3.5 h-3.5 text-emerald-600" /> Offer
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <Ban className="w-3.5 h-3.5 text-rose-600" /> Rejected
        </span>
      );
    case 'WITHDRAWN':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          <XCircle className="w-3.5 h-3.5 text-slate-400" /> Withdrawn
        </span>
      );
  }
}

export default function OpportunitiesPage() {
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<AtsStage | 'ALL'>('ALL');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    openingsApi
      .list()
      .then(async (res) => {
        const perOpening = await Promise.all(
          res.openings.map(async (opening) => {
            try {
              const listed = await applicationsApi.listForOpening(opening.openingId);
              return listed.applications.map((application) => ({
                application,
                companyName: opening.companyName,
                roleTitle: opening.roleTitle,
              }));
            } catch {
              return [];
            }
          }),
        );
        if (!cancelled) setRows(perOpening.flat());
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught, 'Could not load candidate applications.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = rows.filter(({ application, companyName, roleTitle }) => {
    if (stageFilter !== 'ALL' && application.stage !== stageFilter) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (application.studentName ?? '').toLowerCase().includes(query) ||
      roleTitle.toLowerCase().includes(query) ||
      companyName.toLowerCase().includes(query)
    );
  });

  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Opportunity Tracking</h2>
          <p className="text-slate-500 text-sm mt-1">
            Monitor candidate progress across every opening and stage.
          </p>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, role, or company..."
            className="w-full bg-slate-50 text-slate-900 text-sm rounded-lg py-2 pl-10 pr-4 border border-slate-200 focus:outline-none focus:border-[#004c63] focus:ring-1 focus:ring-[#004c63] transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as AtsStage | 'ALL')}
            className="bg-slate-50 text-slate-700 text-sm rounded-lg border border-slate-200 px-4 py-2 focus:outline-none focus:border-[#004c63]"
          >
            {STAGE_FILTERS.map((stage) => (
              <option key={stage} value={stage}>
                {stage === 'ALL' ? 'All Stages' : stage.charAt(0) + stage.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            className="bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 flex items-center gap-2 font-medium"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            Apply Filters
          </Button>
        </div>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-xl">
        {error ? (
          <div className="p-6">
            <Alert tone="danger" title="Applications unavailable">
              {error}
            </Alert>
          </div>
        ) : loading ? (
          <p role="status" className="p-6 text-sm text-slate-500">
            Loading candidate pipeline…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No applications match this view yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Candidate</th>
                  <th className="px-6 py-3.5">Opportunity</th>
                  <th className="px-6 py-3.5">Pipeline Status</th>
                  <th className="px-6 py-3.5">Match Score</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ application, companyName, roleTitle }) => (
                  <tr
                    key={application.applicationId}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {application.studentName ?? 'Candidate'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Updated{' '}
                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                          new Date(application.updatedAt),
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{roleTitle}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> {companyName}
                      </div>
                    </td>
                    <td className="px-6 py-4">{stageBadge(application.stage)}</td>
                    <td className="px-6 py-4">
                      {application.matchScore !== null ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                          {Math.round(application.matchScore * 100)}%
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Not scored yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {application.stage === 'SHORTLISTED' || application.stage === 'INTERVIEW' ? (
                        <Link href="/review">
                          <Button
                            variant="primary"
                            className="bg-[#004c63] hover:bg-[#003a4d] text-white text-xs h-8 px-4 rounded-full font-semibold shadow-sm"
                          >
                            Review & Send
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/ats?applicationId=${application.applicationId}`}>
                          <Button
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8 px-4 rounded-full font-medium"
                          >
                            View Details
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
