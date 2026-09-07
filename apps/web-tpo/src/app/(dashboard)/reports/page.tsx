'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Download, Filter, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button, Card } from '@smart/ui';
import {
  SKILL_DEFINITIONS,
  type InstitutionStudentDto,
  type SkillClaimDto,
  type SkillStream,
} from '@smart/contracts';
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

export default function ReportsPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Updated Filters according to user requirements:
  // 1. Candidate Stream Filter
  // 2. Skills Filter (replaced Subjects/Domains with Skills)
  // 3. Proficiency Filter
  const [streamFilter, setStreamFilter] = useState<string>('ALL');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [proficiencyFilter, setProficiencyFilter] = useState<string>('ALL');

  useEffect(() => {
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

  // Filtered dataset for reporting
  const filteredStudents = students.filter((student) => {
    const studentClaims = claims.filter((c) => c.studentId === student.userId);
    const firstClaim = studentClaims[0];
    const candidateStream = firstClaim
      ? skillStreamFor(firstClaim.skillCode)
      : 'SOFTWARE_DEVELOPMENT';

    // 1st Filter: Candidate Stream
    if (streamFilter !== 'ALL' && candidateStream !== streamFilter) return false;

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

  // CSV / Excel Export Handler (RFC 4180 compliant with UTF-8 BOM for Excel compatibility)
  function handleExportCsv() {
    const headers = [
      'Candidate ID',
      'Full Name',
      'Email Address',
      'Batch Name',
      'Candidate Stream',
      'Onboarding Status',
      'Verified Credentials Count',
      'Skills List',
    ];

    const formatCell = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredStudents.map((student) => {
      const studentClaims = claims.filter((c) => c.studentId === student.userId);
      const verifiedClaims = studentClaims.filter((c) => c.status === 'VERIFIED');
      const firstClaim = studentClaims[0];
      const candidateStream = firstClaim
        ? skillStreamFor(firstClaim.skillCode)
        : 'SOFTWARE_DEVELOPMENT';

      const skillNames = studentClaims
        .map((c) => SKILL_DEFINITIONS.find((s) => s.code === c.skillCode)?.name ?? c.skillCode)
        .join('; ');

      return [
        formatCell(student.userId),
        formatCell(student.fullName),
        formatCell(student.email),
        formatCell(student.batchName ?? 'N/A'),
        formatCell(streamLabel(candidateStream)),
        formatCell(student.inviteStatus === 'ACCEPTED' ? 'Completed' : 'Pending'),
        verifiedClaims.length,
        formatCell(skillNames || 'Enrolled Core Skills'),
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.map((h) => formatCell(h)).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `smart_tpo_cohort_telemetry_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="max-w-[1400px] mx-auto space-y-5 font-sans select-none pb-12 text-zinc-100">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 p-6 md:p-7 rounded-xl border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="size-6 text-zinc-300" />
              Cohort Reporting & Export
            </h1>
            <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold px-2.5 py-0.5 rounded-md">
              CSV Export Ready
            </span>
          </div>
          <p className="text-zinc-400 text-xs md:text-sm font-medium">
            Generate and export cohort reports detailing candidate streams, skills, and verification
            status.
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors border border-emerald-500/50 shadow-sm flex items-center gap-2 shrink-0"
        >
          <Download className="size-4" /> Export CSV Report ({filteredStudents.length})
        </Button>
      </div>

      {/* Filter Toolbar Card */}
      <Card className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-zinc-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Active Report Filters:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* 1st Filter: Candidate Streams */}
            <select
              aria-label="Filter Report by Candidate Stream"
              className="bg-zinc-950 text-zinc-300 text-xs rounded-lg border border-zinc-800 px-3.5 py-2 focus:outline-none focus:border-zinc-600 font-medium cursor-pointer"
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
              aria-label="Filter Report by Skills"
              className="bg-zinc-950 text-zinc-300 text-xs rounded-lg border border-zinc-800 px-3.5 py-2 focus:outline-none focus:border-zinc-600 font-medium cursor-pointer"
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
              aria-label="Filter Report by Proficiency"
              className="bg-zinc-950 text-zinc-300 text-xs rounded-lg border border-zinc-800 px-3.5 py-2 focus:outline-none focus:border-zinc-600 font-medium cursor-pointer"
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
      </Card>

      {/* Report Table Preview Container */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-400" /> Report Table Preview
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Export format matches the table columns below.
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-400">
            Showing {filteredStudents.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-zinc-900 text-zinc-300 font-semibold border-b border-zinc-800 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Candidate</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Stream</th>
                <th className="px-5 py-3">Skills</th>
                <th className="px-5 py-3">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-500 font-medium">
                    Loading reports data…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-500 font-medium">
                    No candidates match the report filters.
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

                  const skillsList = studentClaims
                    .map(
                      (c) =>
                        SKILL_DEFINITIONS.find((s) => s.code === c.skillCode)?.name ?? c.skillCode,
                    )
                    .join(', ');

                  return (
                    <tr key={student.userId} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-white">{student.fullName}</td>
                      <td className="px-5 py-3.5 font-mono text-zinc-400">{student.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-900 text-zinc-200 border border-zinc-800">
                          {streamLabel(streamCode)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-zinc-300 max-w-xs truncate">
                        {skillsList || 'Enrolled Core Skills'}
                      </td>
                      <td className="px-5 py-3.5">
                        {verifiedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="size-3" /> {verifiedCount} Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                            <Clock className="size-3" /> Pending Onboarding
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
