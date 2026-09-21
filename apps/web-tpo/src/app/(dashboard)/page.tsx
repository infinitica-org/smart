'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Users } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { AuthenticatedUser, InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import { DashboardHero } from '../../components/dashboard/DashboardHero';
import { DashboardMetricCard } from '../../components/dashboard/DashboardMetricCard';
import { PlacementSnapshotCard } from '../../components/dashboard/PlacementSnapshotCard';
import { QuickActionsCard } from '../../components/dashboard/QuickActionsCard';
import { RecentCandidatesCard } from '../../components/dashboard/RecentCandidatesCard';
import { UpcomingActivitiesCard } from '../../components/dashboard/UpcomingActivitiesCard';
import { api } from '../../lib/api';
import { computeDashboardMetrics, greetingForHour } from '../../lib/tpo-dashboard-metrics';
import { dashboardCanvasClass, dashboardErrorNoticeClass } from '../../lib/tpo-dashboard-ui';

export default function DashboardPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.onboarding.listTpoStudents().catch(() => [] as InstitutionStudentDto[]),
      api.assessment.listSkillClaims().catch(() => [] as SkillClaimDto[]),
      api.auth.me().catch(() => null),
    ])
      .then(([studentList, claimList, me]) => {
        if (!active) return;
        setStudents(studentList);
        setClaims(claimList);
        setUser(me);
      })
      .catch((err) => {
        if (!active) return;
        setError(isSmartApiError(err) ? err.message : 'Failed to load cohort telemetry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => computeDashboardMetrics(students, claims), [students, claims]);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const greeting = greetingForHour(new Date().getHours());
  const displayName = user?.fullName ?? 'Pilot TPO';

  return (
    <div className={`tpo-dashboard ${dashboardCanvasClass}`}>
      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <DashboardHero
          greeting={greeting}
          displayName={displayName}
          formattedDate={formattedDate}
          loading={loading && !user}
        />
        <QuickActionsCard />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:gap-5">
        <DashboardMetricCard
          label="Total Onboarded"
          value={metrics.totalProvisioned}
          hint="Total candidate accounts onboarded"
          footnote="Current total"
          icon={Users}
          accent="blue"
          loading={loading}
        />
        <DashboardMetricCard
          label="Verified Skills"
          value={metrics.verifiedClaimsCount}
          hint="Autonomous certified credentials"
          footnote={
            metrics.verifiedClaimsCount === 0
              ? 'No verified skills yet'
              : 'Verified credentials on platform'
          }
          icon={Award}
          accent="amber"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <PlacementSnapshotCard />
        <UpcomingActivitiesCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <RecentCandidatesCard students={students} claims={claims} loading={loading} />
      </div>
    </div>
  );
}
