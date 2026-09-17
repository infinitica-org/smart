import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import { skillCategoryFor } from './skill-taxonomy';

export const DOMAIN_CATEGORY_KEYS = [
  {
    id: 'PROGRAMMING_LANGUAGES' as const,
    title: 'Software Engineering',
    subtitle: 'Programming & DSA',
  },
  {
    id: 'AI_ML_DATA_SCIENCE' as const,
    title: 'AI & Machine Learning',
    subtitle: 'ML & Neural Networks',
  },
  {
    id: 'DATA_ENGINEERING_BIG_DATA' as const,
    title: 'Data & Analytics',
    subtitle: 'SQL & Visualization',
  },
];

export type DashboardMetrics = {
  totalProvisioned: number;
  invitesAccepted: number;
  onboardingRate: number;
  verifiedClaimsCount: number;
  categoryCounts: Record<string, number>;
  inviteBreakdown: {
    accepted: number;
    pending: number;
    other: number;
  };
};

export function computeDashboardMetrics(
  students: InstitutionStudentDto[],
  claims: SkillClaimDto[],
): DashboardMetrics {
  const totalProvisioned = students.length;
  const invitesAccepted = students.filter((s) => s.inviteStatus === 'ACCEPTED').length;
  const onboardingRate =
    totalProvisioned > 0 ? Math.round((invitesAccepted / totalProvisioned) * 100) : 0;
  const verifiedClaimsCount = claims.filter((c) => c.status === 'VERIFIED').length;

  const categoryCounts: Record<string, number> = {};
  claims
    .filter((c) => c.status === 'VERIFIED')
    .forEach((claim) => {
      const categoryId = skillCategoryFor(claim.skillCode);
      if (!categoryId) return;
      categoryCounts[categoryId] = (categoryCounts[categoryId] ?? 0) + 1;
    });

  let pending = 0;
  let other = 0;
  for (const student of students) {
    if (student.inviteStatus === 'ACCEPTED') continue;
    if (student.inviteStatus === 'PENDING') pending += 1;
    else other += 1;
  }

  return {
    totalProvisioned,
    invitesAccepted,
    onboardingRate,
    verifiedClaimsCount,
    categoryCounts,
    inviteBreakdown: {
      accepted: invitesAccepted,
      pending,
      other,
    },
  };
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}
