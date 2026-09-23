'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { AuthenticatedUser, InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import { UniversityDashboard } from '../../components/dashboard/UniversityDashboard';
import { api } from '../../lib/api';
import { countInstitutionPlacementApplications } from '../../lib/placement-application-count';
import { dashboardCanvasClass, dashboardErrorNoticeClass } from '../../lib/tpo-dashboard-ui';

export default function DashboardPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [placementApplicationCount, setPlacementApplicationCount] = useState(0);
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
      countInstitutionPlacementApplications()
        .then((r) => r.total)
        .catch(() => 0),
      api.auth.me().catch(() => null),
    ])
      .then(([studentList, claimList, applicationCount, me]) => {
        if (!active) return;
        setStudents(studentList);
        setClaims(claimList);
        setPlacementApplicationCount(applicationCount);
        setUser(me);
      })
      .catch((err) => {
        if (!active) return;
        setError(isSmartApiError(err) ? err.message : 'Failed to load dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const institutionName =
    user?.institutionName?.trim() || user?.fullName?.trim() || 'Your institution';

  return (
    <div className={`tpo-dashboard ${dashboardCanvasClass}`}>
      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}
      <UniversityDashboard
        students={students}
        claims={claims}
        placementApplicationCount={placementApplicationCount}
        institutionName={institutionName}
        loading={loading}
      />
    </div>
  );
}
