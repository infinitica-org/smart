'use client';

import { useEffect, useState } from 'react';

import { Users, Search, CheckCircle2, Clock } from 'lucide-react';

import {
  SKILL_CATEGORY_IDS,
  SKILL_DEFINITIONS,
  type InstitutionStudentDto,
  type SkillClaimDto,
} from '@smart/contracts';

import { CandidateDetailDrawer } from '../../../../components/candidate-detail-drawer';

import { TpoBentoPageHeader } from '../../../../components/tpo-bento/TpoBentoPageHeader';

import { api } from '../../../../lib/api';

import {
  categoryLabel,
  categoryNameForSkillCode,
  skillCategoryFor,
} from '../../../../lib/skill-taxonomy';

import {
  bentoChipClass,
  bentoTableBodyRowClass,
  bentoTableClass,
  bentoTableHeadRowClass,
  bentoTableShellClass,
  bentoCompactToolbarClass,
  candidatesControlClass,
  candidatesFilterGridClass,
  candidatesPageStackClass,
  candidatesTableCellClass,
  candidatesTableHeadCellClass,
  dashboardMintBadgeClass,
  dashboardPendingBadgeClass,
  dashboardPillClass,
  dashboardStatusNeutralClass,
} from '../../../../lib/tpo-dashboard-ui';

import { secondaryButtonSmClass } from '../../../../lib/tpo-ui';

function candidateCountLabel(count: number): string {
  return count === 1 ? '1 candidate' : `${count} candidates`;
}

export default function CandidatesPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);

  const [claims, setClaims] = useState<SkillClaimDto[]>([]);

  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [skillFilter, setSkillFilter] = useState<string>('ALL');

  const [proficiencyFilter, setProficiencyFilter] = useState<string>('ALL');

  const [selectedStudent, setSelectedStudent] = useState<InstitutionStudentDto | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);

      const q = params.get('q');

      if (q) setSearchQuery(q);
    }

    api.assessment

      .listSkillClaims()

      .then((claimList) => setClaims(claimList))

      .catch(() => setClaims([]));
  }, []);

  useEffect(() => {
    setLoading(true);

    const q = searchQuery.trim() || undefined;

    const timer = setTimeout(() => {
      api.onboarding

        .listTpoStudents({ q })

        .then((studentList) => setStudents(studentList))

        .catch(() => setStudents([]))

        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.trim().toLowerCase();

    if (
      query &&
      !student.fullName.toLowerCase().includes(query) &&
      !student.email.toLowerCase().includes(query)
    ) {
      return false;
    }

    const studentClaims = claims.filter((c) => c.studentId === student.userId);

    if (categoryFilter !== 'ALL') {
      const hasCategory = studentClaims.some(
        (claim) => skillCategoryFor(claim.skillCode) === categoryFilter,
      );

      if (!hasCategory && studentClaims.length > 0) return false;
    }

    if (skillFilter !== 'ALL') {
      if (!studentClaims.some((c) => c.skillCode === skillFilter)) return false;
    }

    if (proficiencyFilter !== 'ALL') {
      if (!studentClaims.some((c) => c.proficiency === proficiencyFilter)) return false;
    }

    return true;
  });

  return (
    <div className={candidatesPageStackClass}>
      <TpoBentoPageHeader
        compact

        title="Candidates Repository"

        description="Search and review onboarded candidates — streams, onboarding progress, and skill verification status."

        icon={Users}

        badge={<span className={bentoChipClass}>{candidateCountLabel(students.length)}</span>}
      />

      <div className={bentoCompactToolbarClass}>
        <div className={candidatesFilterGridClass}>
          <div className="relative min-w-0 xl:col-span-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-text-subtle)]"

              aria-hidden
            />

            <input
              type="search"

              placeholder="Search candidates by name or email..."

              aria-label="Search candidates"

              className={`${candidatesControlClass} pl-9`}

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            aria-label="Filter by skill category"

            className={candidatesControlClass}

            value={categoryFilter}

            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>

            {SKILL_CATEGORY_IDS.map((categoryId) => (
              <option key={categoryId} value={categoryId}>
                {categoryLabel(categoryId)}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Skills"

            className={candidatesControlClass}

            value={skillFilter}

            onChange={(e) => setSkillFilter(e.target.value)}
          >
            <option value="ALL">All Skills</option>

            {SKILL_DEFINITIONS.map((skill) => (
              <option key={skill.code} value={skill.code}>
                {skill.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Proficiency"

            className={candidatesControlClass}

            value={proficiencyFilter}

            onChange={(e) => setProficiencyFilter(e.target.value)}
          >
            <option value="ALL">All Proficiencies</option>

            <option value="PROFESSIONAL">Professional</option>

            <option value="ADVANCED">Advanced</option>

            <option value="INTERMEDIATE">Intermediate</option>

            <option value="BEGINNER">Beginner</option>
          </select>
        </div>
      </div>

      <div className={bentoTableShellClass}>
        <div className="overflow-x-auto">
          <table className={`${bentoTableClass} w-full min-w-[880px]`}>
            <thead>
              <tr className={bentoTableHeadRowClass}>
                <th className={candidatesTableHeadCellClass}>Candidate</th>

                <th className={candidatesTableHeadCellClass}>Primary Skill Category</th>

                <th className={candidatesTableHeadCellClass}>Onboarding Progress</th>

                <th className={candidatesTableHeadCellClass}>Verification Status</th>

                <th className={`${candidatesTableHeadCellClass} text-right`}>Details</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`${candidatesTableCellClass} py-8 text-center`}>
                    Loading candidates…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${candidatesTableCellClass} py-8 text-center`}>
                    {students.length === 0
                      ? 'No candidates have been onboarded yet.'
                      : 'No candidates match the selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const studentClaims = claims.filter((c) => c.studentId === student.userId);

                  const verifiedCount = studentClaims.filter((c) => c.status === 'VERIFIED').length;

                  const firstClaim = studentClaims[0];

                  const candidateCategory = firstClaim
                    ? categoryNameForSkillCode(firstClaim.skillCode)
                    : categoryLabel('PROGRAMMING_LANGUAGES');

                  return (
                    <tr key={student.userId} className={bentoTableBodyRowClass}>
                      <td className={candidatesTableCellClass}>
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-[#eef2f6] text-[11px] font-semibold text-[var(--ds-text-secondary)]">
                            {student.fullName.charAt(0)}
                          </span>

                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--ds-text)]">
                              {student.fullName}
                            </div>

                            <div className="truncate text-[12px] text-[var(--ds-text-muted)]">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className={candidatesTableCellClass}>
                        <span className={dashboardPillClass}>{candidateCategory}</span>
                      </td>

                      <td className={candidatesTableCellClass}>
                        {student.inviteStatus === 'ACCEPTED' ? (
                          <span className={dashboardMintBadgeClass}>
                            <CheckCircle2 className="size-3" /> Completed
                          </span>
                        ) : (
                          <span className={dashboardPendingBadgeClass}>
                            <Clock className="size-3" /> Invite Sent / Pending
                          </span>
                        )}
                      </td>

                      <td className={candidatesTableCellClass}>
                        {verifiedCount > 0 ? (
                          <span className={dashboardMintBadgeClass}>
                            <CheckCircle2 className="size-3" /> {verifiedCount} Verified
                          </span>
                        ) : (
                          <span className={dashboardStatusNeutralClass}>In Evaluation</span>
                        )}
                      </td>

                      <td className={`${candidatesTableCellClass} text-right`}>
                        <button
                          type="button"

                          onClick={() => setSelectedStudent(student)}

                          className={secondaryButtonSmClass}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent ? (
        <CandidateDetailDrawer
          candidate={selectedStudent}

          isOpen={Boolean(selectedStudent)}

          onClose={() => setSelectedStudent(null)}
        />
      ) : null}
    </div>
  );
}
