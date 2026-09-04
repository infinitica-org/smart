'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  CheckCircle,
  TrendingUp,
  Inbox,
  Briefcase,
  Activity,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { Alert, Button, Card, KpiCard, FunnelPipeline, type FunnelStep } from '@smart/ui';
import { applicationsApi, openingsApi, api } from '../../lib/api';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

interface DashboardStats {
  totalCandidates: number;
  needsAttention: number;
  verifiedSkills: number;
  activePlacements: number;
  applied: number;
  shortlisted: number;
  interviewing: number;
  offered: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.onboarding.listTpoStudents(),
      openingsApi.list(),
      // Institution-scoped for INSTITUTION_ADMIN/PLACEMENT_STAFF callers — see
      // AssessmentService.listSkillClaims.
      api.assessment.listSkillClaims().catch(() => []),
    ])
      .then(async ([students, openingsRes, claims]) => {
        const perOpening = await Promise.all(
          openingsRes.openings.map((opening) =>
            applicationsApi.listForOpening(opening.openingId).catch(() => ({ applications: [] })),
          ),
        );
        const applications = perOpening.flatMap((res) => res.applications);
        if (cancelled) return;
        setStats({
          totalCandidates: students.length,
          needsAttention: students.filter((s) => s.heldAt !== null).length,
          verifiedSkills: claims.filter((c) => c.status === 'VERIFIED').length,
          activePlacements: applications.filter((a) => a.stage === 'OFFER').length,
          applied: applications.filter((a) => a.stage === 'APPLIED').length,
          shortlisted: applications.filter((a) => a.stage === 'SHORTLISTED').length,
          interviewing: applications.filter((a) => a.stage === 'INTERVIEW').length,
          offered: applications.filter((a) => a.stage === 'OFFER').length,
        });
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught, 'Could not load your dashboard.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pipelineSteps: FunnelStep[] = stats
    ? [
        { id: '1', label: 'Applied', value: stats.applied, icon: Inbox },
        { id: '2', label: 'Shortlisted', value: stats.shortlisted, icon: FileText },
        { id: '3', label: 'Interviewing', value: stats.interviewing, icon: Activity },
        { id: '4', label: 'Offered', value: stats.offered, icon: Briefcase, shine: true },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Daily Operational View
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitor candidate readiness and placement activity across your institution.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#131313] p-1 rounded-full border border-white/5">
          <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:text-white">
            All time
          </Button>
        </div>
      </div>

      {error ? (
        <Alert tone="danger" title="Dashboard unavailable">
          {error}
        </Alert>
      ) : loading || !stats ? (
        <p role="status" className="text-sm text-gray-400">
          Loading your dashboard…
        </p>
      ) : (
        <>
          {/* Row 1: KPI Bento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Candidates" value={stats.totalCandidates} icon={Users} />
            <KpiCard
              label="Verified Skills"
              value={stats.verifiedSkills}
              icon={CheckCircle}
              accent
              hint="Across all active cohorts"
            />
            <KpiCard label="Active Placements" value={stats.activePlacements} icon={TrendingUp} />
            <KpiCard
              label="Needs Attention"
              value={stats.needsAttention}
              icon={AlertCircle}
              hint="Candidates on hold"
            />
          </div>

          {/* Row 2: Pipeline */}
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-[#131313] border-white/5 overflow-hidden">
              <div className="p-5">
                <FunnelPipeline title="Placement Pipeline" steps={pipelineSteps} />
              </div>
            </Card>
          </div>

          {/* Row 3: not yet built — batch readiness and skill-gap analytics need a
              dedicated rollup endpoint that doesn't exist yet. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-[#131313] border-white/5 p-6 text-sm text-gray-400">
              Batch readiness scoring is coming soon.
            </Card>
            <Card className="bg-[#131313] border-white/5 p-6 text-sm text-gray-400">
              Institution-wide skill gap analysis is coming soon.
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
