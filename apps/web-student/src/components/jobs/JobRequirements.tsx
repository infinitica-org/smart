import Link from 'next/link';
import type { JobRequirementRow, JobRequirementStatus } from '@smart/contracts';

const STATUS_LABEL: Record<JobRequirementStatus, string> = {
  MET: 'Met',
  PARTIAL: 'Partly met',
  MISSING: 'Missing',
};
const STATUS_STYLE: Record<JobRequirementStatus, string> = {
  MET: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-800 border-amber-200',
  MISSING: 'bg-red-50 text-red-800 border-red-200',
};

function level(value: string | null): string {
  return value ? value.charAt(0) + value.slice(1).toLowerCase() : 'Not verified';
}

/** Required skills against the student's current level, with a next step for every gap (Th6-383). */
export function JobRequirements({ requirements }: { requirements: JobRequirementRow[] }) {
  if (requirements.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        This job does not list required skills yet, so we cannot compare them with yours.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="py-2 pr-3">Skill</th>
            <th className="py-2 pr-3">Required level</th>
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Your level</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Evidence</th>
            <th className="py-2">Next step</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((row) => {
            const mandatoryGap = row.importance === 'MANDATORY' && row.status !== 'MET';
            return (
              <tr
                key={row.skillCode}
                data-testid={`requirement-${row.skillCode}`}
                data-mandatory-gap={mandatoryGap}
                className={`border-t border-zinc-200 dark:border-zinc-800 ${mandatoryGap ? 'bg-red-50/60 dark:bg-red-950/20' : ''}`}
              >
                <td className="py-2 pr-3 font-semibold">{row.skillName}</td>
                <td className="py-2 pr-3">{level(row.requiredProficiency)}</td>
                <td className="py-2 pr-3">
                  {row.importance === 'MANDATORY' ? 'Mandatory' : 'Preferred'}
                </td>
                <td className="py-2 pr-3">{level(row.studentProficiency)}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.status]}`}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  {row.evidenceRequired === 0
                    ? 'None required'
                    : `${row.evidenceMet} of ${row.evidenceRequired}`}
                </td>
                <td className="py-2">
                  {row.action ? (
                    <Link
                      href={row.action.href}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {row.action.label}
                    </Link>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
