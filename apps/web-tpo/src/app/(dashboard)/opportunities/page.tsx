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
        <span className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
          <Clock className="w-3.5 h-3.5" /> Applied
        </span>
      );
    case 'SHORTLISTED':
      return (
        <span className="flex items-center gap-1.5 text-blue-400 text-xs font-medium">
          <Shield className="w-3.5 h-3.5" /> Shortlisted
        </span>
      );
    case 'INTERVIEW':
      return (
        <span className="flex items-center gap-1.5 text-[#00fad0] text-xs font-medium">
          <Video className="w-3.5 h-3.5" /> Interview
        </span>
      );
    case 'OFFER':
      return (
        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <Shield className="w-3.5 h-3.5" /> Offer
        </span>
      );
    case 'REJECTED':
      return (
        <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
          <Ban className="w-3.5 h-3.5" /> Rejected
        </span>
      );
    case 'WITHDRAWN':
      return (
        <span className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
          <XCircle className="w-3.5 h-3.5" /> Withdrawn
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
          <h2 className="text-2xl font-semibold tracking-tight text-white">Opportunity Tracking</h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitor candidate progress across every opening and stage.
          </p>
        </div>
      </div>

      <Card className="bg-[#131313] border-white/5 p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, role, or company..."
            className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 pl-10 pr-4 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as AtsStage | 'ALL')}
            className="bg-[#1a1a1a] text-gray-300 text-sm rounded-lg border border-white/5 px-4 focus:outline-none focus:border-[#00fad0]/50"
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
            className="bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </Button>
        </div>
      </Card>

      <Card className="bg-[#131313] border-white/5 overflow-hidden">
        {error ? (
          <div className="p-6">
            <Alert tone="danger" title="Applications unavailable">
              {error}
            </Alert>
          </div>
        ) : loading ? (
          <p role="status" className="p-6 text-sm text-gray-400">
            Loading candidate pipeline…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            No applications match this view yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#161616] border-b border-white/5 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Candidate</th>
                  <th className="px-6 py-4 font-medium">Opportunity</th>
                  <th className="px-6 py-4 font-medium">Pipeline Status</th>
                  <th className="px-6 py-4 font-medium">Match Score</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(({ application, companyName, roleTitle }) => (
                  <tr
                    key={application.applicationId}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {application.studentName ?? 'Candidate'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Updated{' '}
                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                          new Date(application.updatedAt),
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-300">{roleTitle}</div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <Building2 className="w-3.5 h-3.5" /> {companyName}
                      </div>
                    </td>
                    <td className="px-6 py-4">{stageBadge(application.stage)}</td>
                    <td className="px-6 py-4">
                      {application.matchScore !== null ? (
                        <span className="flex items-center justify-center w-10 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs">
                          {Math.round(application.matchScore * 100)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Not scored yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {application.stage === 'SHORTLISTED' || application.stage === 'INTERVIEW' ? (
                        <Link href="/review">
                          <Button
                            variant="primary"
                            className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white text-xs h-8 px-4 rounded-full"
                          >
                            Review & Send
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/ats?applicationId=${application.applicationId}`}>
                          <Button
                            variant="outline"
                            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs h-8 px-4 rounded-full"
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
