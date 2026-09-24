import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';

export type StudentVerificationState = 'Full' | 'Partial' | 'Pending';

export type UniversityDashboardMetrics = {
  whitelisted: number;
  fullyVerified: number;
  opportunitiesMatched: number;
};

export type UniversityRosterRow = {
  userId: string;
  name: string;
  major: string;
  verificationState: StudentVerificationState;
  hiredLabel: string;
};

function verifiedClaimCountByStudent(claims: SkillClaimDto[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const claim of claims) {
    if (claim.status !== 'VERIFIED') continue;
    map.set(claim.studentId, (map.get(claim.studentId) ?? 0) + 1);
  }
  return map;
}

export function verificationStateForStudent(
  student: InstitutionStudentDto,
  verifiedClaimsByStudent: Map<string, number>,
): StudentVerificationState {
  const verifiedCount = verifiedClaimsByStudent.get(student.userId) ?? 0;
  if (verifiedCount > 0) return 'Full';
  if (student.inviteStatus === 'ACCEPTED') return 'Partial';
  return 'Pending';
}

export function computeUniversityDashboardMetrics(
  students: InstitutionStudentDto[],
  claims: SkillClaimDto[],
  placementApplicationCount: number,
): UniversityDashboardMetrics {
  const verifiedByStudent = verifiedClaimCountByStudent(claims);
  const fullyVerified = students.filter((s) => (verifiedByStudent.get(s.userId) ?? 0) > 0).length;

  return {
    whitelisted: students.length,
    fullyVerified,
    opportunitiesMatched: placementApplicationCount,
  };
}

export function buildUniversityRosterRows(
  students: InstitutionStudentDto[],
  claims: SkillClaimDto[],
): UniversityRosterRow[] {
  const verifiedByStudent = verifiedClaimCountByStudent(claims);

  return students.map((student) => ({
    userId: student.userId,
    name: student.fullName,
    major: student.batchName?.trim() || 'Undeclared',
    verificationState: verificationStateForStudent(student, verifiedByStudent),
    hiredLabel: '—',
  }));
}
