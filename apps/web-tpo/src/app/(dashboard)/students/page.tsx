'use client';

import { useEffect, useState } from 'react';
import { Users, Search, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@smart/ui';
import {
  SKILL_DEFINITIONS,
  type InstitutionStudentDto,
  type SkillClaimDto,
  type SkillStream,
} from '@smart/contracts';
import { CandidateDetailDrawer } from '../../../components/candidate-detail-drawer';
import { api } from '../../../lib/api';

function skillStreamFor(code: string): SkillStream {
  const stream = SKILL_DEFINITIONS.find((s) => s.code === code)?.stream;
  if (!stream || stream === 'UNIVERSAL') return 'SOFTWARE_DEVELOPMENT';
  return stream;
}

function streamLabel(stream: string): string {
  switch (stream) {
    case 'SOFTWARE_DEVELOPMENT':
      return 'Software Engineering';
    case 'DATA_SCIENCE_ANALYTICS':
      return 'Data & Analytics';
    case 'AI_ML_ENGINEERING':
      return 'AI & Machine Learning';
    default:
      return stream.replace(/_/g, ' ');
  }
}

export default function CandidatesPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters:
  // 1. Search Query
  // 2. Candidate Stream Filter
  // 3. Skills Filter
  // 4. Proficiency Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState<string>('ALL');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [proficiencyFilter, setProficiencyFilter] = useState<string>('ALL');

  // Selected candidate drawer state
  const [selectedStudent, setSelectedStudent] = useState<InstitutionStudentDto | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        setSearchQuery(q);
      }
    }

    setLoading(true);
    Promise.all([
      api.onboarding.listTpoStudents().catch(() => [] as InstitutionStudentDto[]),
      api.assessment.listSkillClaims().catch(() => [] as SkillClaimDto[]),
    ])
      .then(([studentList, claimList]) => {
        setStudents(studentList);
        setClaims(claimList);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter logic
  const filteredStudents = students.filter((student) => {
    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (
      query &&
      !student.fullName.toLowerCase().includes(query) &&
      !student.email.toLowerCase().includes(query)
    ) {
      return false;
    }

    const studentClaims = claims.filter((c) => c.studentId === student.userId);
    const firstClaim = studentClaims[0];
    const candidateStream = firstClaim
      ? skillStreamFor(firstClaim.skillCode)
      : 'SOFTWARE_DEVELOPMENT';

    // 1st Filter: Stream
    if (streamFilter !== 'ALL' && candidateStream !== streamFilter) {
      return false;
    }

    // 2nd Filter: Skills
    if (skillFilter !== 'ALL') {
      const hasSkill = studentClaims.some((c) => c.skillCode === skillFilter);
      if (!hasSkill) return false;
    }

    // 3rd Filter: Proficiency
    if (proficiencyFilter !== 'ALL') {
      const hasMatchingProficiency = studentClaims.some((c) => c.proficiency === proficiencyFilter);
      if (!hasMatchingProficiency) return false;
    }

    return true;
  });

  return (
    <main className="max-w-[1400px] mx-auto space-y-5 font-sans select-none pb-12 text-zinc-100">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 p-6 md:p-7 rounded-xl border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Users className="size-6 text-zinc-300" />
              Candidate Roster & Observability
            </h1>
            <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold px-2.5 py-0.5 rounded-md">
              {students.length} Candidates
            </span>
          </div>
          <p className="text-zinc-400 text-xs md:text-sm font-medium">
            Read-only visibility into candidate-selected streams, onboarding progress, and
            autonomous skill verification.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => (window.location.href = '/provisioning')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors border border-emerald-500/50 shadow-sm"
          >
            + Onboard Candidates
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search candidates by name or email..."
            className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2 pl-9 pr-4 border border-zinc-800 focus:outline-none focus:border-zinc-600 font-medium placeholder:text-zinc-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* 1st Filter: Stream */}
          <select
            aria-label="Filter by Candidate Stream"
            className="bg-zinc-950 text-zinc-300 text-xs rounded-lg border border-zinc-800 px-3 py-2 focus:outline-none focus:border-zinc-600 font-medium cursor-pointer"
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value)}
          >
            <option value="ALL">All Streams</option>
            <option value="SOFTWARE_DEVELOPMENT">Software Engineering</option>
            <option value="AI_ML_ENGINEERING">AI & Machine Learning</option>
            <option value="DATA_SCIENCE_ANALYTICS">Data & Analytics</option>
          </select>

          {/* 2nd Filter: Skills */}
          <select
            aria-label="Filter by Skills"
            className="bg-zinc-950 text-zinc-300 text-xs rounded-lg border border-zinc-800 px-3 py-2 focus:outline-none focus:border-zinc-600 font-medium cursor-pointer"
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

          {/* 3rd Filter: Proficiency */}
          <select
            aria-label="Filter by Proficiency"
            className="bg-zinc-950 text-zinc-300 text-xs rounded-lg border border-zinc-800 px-3 py-2 focus:outline-none focus:border-zinc-600 font-medium cursor-pointer"
            value={proficiencyFilter}
            onChange={(e) => setProficiencyFilter(e.target.value)}
          >
            <option value="ALL">All Proficiencies</option>
            <option value="ADVANCED">Advanced</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="BEGINNER">Beginner</option>
          </select>
        </div>
      </div>

      {/* Candidate Table Container */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-zinc-900 text-zinc-300 font-semibold border-b border-zinc-800 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Candidate</th>
                <th className="px-5 py-3">Candidate-Selected Stream</th>
                <th className="px-5 py-3">Onboarding Progress</th>
                <th className="px-5 py-3">Verification Status</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-500 font-medium">
                    Loading candidates…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-500 font-medium">
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
                  const streamCode = firstClaim
                    ? skillStreamFor(firstClaim.skillCode)
                    : 'SOFTWARE_DEVELOPMENT';

                  return (
                    <tr key={student.userId} className="hover:bg-zinc-900/50 transition-colors">
                      {/* Candidate Name & Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold flex items-center justify-center text-xs">
                            {student.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white">{student.fullName}</div>
                            <div className="text-zinc-500 font-mono text-[11px]">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Read-Only Candidate-Selected Stream */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-900 text-zinc-200 border border-zinc-800">
                          {streamLabel(streamCode)}
                        </span>
                      </td>

                      {/* Onboarding Progress */}
                      <td className="px-5 py-3.5">
                        {student.inviteStatus === 'ACCEPTED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="size-3" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <Clock className="size-3" /> Invite Sent / Pending
                          </span>
                        )}
                      </td>

                      {/* Autonomous Verification Telemetry */}
                      <td className="px-5 py-3.5">
                        {verifiedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="size-3" /> {verifiedCount} Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                            In Evaluation
                          </span>
                        )}
                      </td>

                      {/* Detail Drawer Trigger */}
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStudent(student)}
                          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-[11px] border border-zinc-800 rounded-lg px-3 py-1"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Detail Modal / Drawer Integration */}
      {selectedStudent && (
        <CandidateDetailDrawer
          candidate={selectedStudent}
          isOpen={Boolean(selectedStudent)}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </main>
  );
}
