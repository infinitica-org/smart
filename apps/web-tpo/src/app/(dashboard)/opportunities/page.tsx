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
    <main className="max-w-[1400px] mx-auto space-y-6 font-sans select-none pb-12">
      {/* Header Bar */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Opportunity Tracking
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">
            Monitor candidate progress across every active opening and ATS recruitment stage.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="bg-white border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row gap-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, role, or company..."
            className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl py-2.5 pl-10 pr-4 border border-slate-200/90 focus:outline-none focus:border-[#004C63] focus:bg-white focus:ring-2 focus:ring-[#004C63]/15 transition-all placeholder:text-slate-400 font-medium shadow-xs"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as AtsStage | 'ALL')}
            className="bg-slate-50 text-slate-700 text-xs rounded-xl border border-slate-200/90 px-4 py-2.5 focus:outline-none focus:border-[#004C63] focus:bg-white font-semibold cursor-pointer shadow-xs transition-all"
          >
            {STAGE_FILTERS.map((stage) => (
              <option key={stage} value={stage}>
                {stage === 'ALL' ? 'All Stages' : stage.charAt(0) + stage.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <Button
            type="button"
            className="bg-[#004C63] hover:bg-[#0A4D5C] text-white flex items-center gap-2 font-bold text-xs rounded-xl px-5 py-2.5 shadow-xs transition-all"
          >
            <Filter className="w-3.5 h-3.5 text-white" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Applications Table */}
      <Card className="bg-white border border-slate-200/80 shadow-xs overflow-hidden rounded-2xl">
        {error ? (
          <div className="p-6">
            <Alert tone="danger" title="Applications unavailable">
              {error}
            </Alert>
          </div>
        ) : loading ? (
          <p role="status" className="p-8 text-sm font-medium text-slate-500">
            Loading candidate pipeline…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-sm font-medium text-slate-500">
            No applications match this view yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Opportunity</th>
                  <th className="px-6 py-4">Pipeline Status</th>
                  <th className="px-6 py-4">Match Score</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ application, companyName, roleTitle }) => (
                  <tr
                    key={application.applicationId}
                    className="hover:bg-[#F0FDFA]/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {application.studentName ?? 'Candidate'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-medium">
                        Updated{' '}
                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                          new Date(application.updatedAt),
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{roleTitle}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-[#004C63]" /> {companyName}
                      </div>
                    </td>
                    <td className="px-6 py-4">{stageBadge(application.stage)}</td>
                    <td className="px-6 py-4">
                      {application.matchScore !== null ? (
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
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
                            className="bg-[#004C63] hover:bg-[#0A4D5C] text-white text-xs h-8 px-4 rounded-xl font-bold shadow-xs transition-all"
                          >
                            Review & Send
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/ats?applicationId=${application.applicationId}`}>
                          <Button
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8 px-4 rounded-xl font-semibold transition-all"
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
