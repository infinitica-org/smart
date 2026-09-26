'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, EmptyState, ErrorState, LoadingState } from '@smart/ui';
import type { UniversityStudentSummary } from '@smart/contracts';
import { universityApi } from '../../lib/api';
import { MessageStudentModal } from './MessageStudentModal';
import { VerificationBadge } from './StudentReadinessRoster';

const DEMONSTRATION_LABEL = {
  DEMONSTRATED: 'Demonstrated',
  PROVISIONAL: 'Provisional',
  NOT_DEMONSTRATED: 'Not demonstrated',
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs"
    >
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

/** Th6-440/441/443 — one student's verification summary, missing evidence and placement status. */
export function StudentReadinessDetail({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<UniversityStudentSummary | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await universityApi.summary(userId));
    } catch (err) {
      setSummary(null);
      setError({
        message: err instanceof Error ? err.message : 'Could not load this student.',
        notFound: (err as { statusCode?: number } | null)?.statusCode === 404,
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState message="Loading student…" />;
  if (error?.notFound) {
    return (
      <EmptyState
        title="Student not found"
        description="This student does not exist or is not in your scope."
        action={<Link href="/students/readiness">Back to roster</Link>}
      />
    );
  }
  if (error || !summary) {
    return (
      <ErrorState
        title="Could not load this student"
        message={error?.message ?? 'Unknown error'}
        onRetry={() => void load()}
      />
    );
  }

  const { student, verification, missingEvidence, opportunities } = summary;
  const { evidence, skillDemonstration, proficiency, identity } = verification;

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/students/readiness" className="text-xs text-zinc-500 hover:underline">
            ← All students
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">{student.fullName}</h1>
          <p className="text-sm text-zinc-500">
            {[student.program, student.graduationYear, student.batchName]
              .filter(Boolean)
              .join(' · ') || student.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <VerificationBadge status={student.verificationStatus} />
            {student.needsAssistance ? <Badge variant="warning">Needs assistance</Badge> : null}
          </div>
        </div>
        <Button onClick={() => setMessaging(true)}>
          {student.needsAssistance ? 'Offer help' : 'Message student'}
        </Button>
      </div>

      {notice ? (
        <Alert tone="success" role="status">
          {notice}
        </Alert>
      ) : null}

      <Section title="Verification summary">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase text-zinc-500">Identity</dt>
            <dd className="mt-1 font-medium">{identity.status.replace('_', ' ').toLowerCase()}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Evidence completeness</dt>
            <dd className="mt-1 font-medium">
              {evidence.completeness
                ? `${evidence.completeness.available} of ${evidence.completeness.required} required items (${evidence.completeness.percent}%)`
                : (evidence.reason ?? 'Not available yet')}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Skill demonstration</dt>
            <dd className="mt-1 font-medium">
              {skillDemonstration.counts.demonstrated} demonstrated ·{' '}
              {skillDemonstration.counts.provisional} provisional ·{' '}
              {skillDemonstration.counts.notDemonstrated} not yet
            </dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
          Proficiency (kept separate from completeness): {proficiency.verifiedSkillCount} verified
          skills, {proficiency.declaredSkillCount} declared.
        </p>
        {skillDemonstration.skills.length > 0 ? (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {skillDemonstration.skills.map((skill) => (
              <li key={skill.skillCode} className="flex justify-between py-2">
                <span>{skill.skillName}</span>
                <span className="text-zinc-500">
                  {skill.proficiency ? `${skill.proficiency} · ` : ''}
                  {DEMONSTRATION_LABEL[skill.demonstration]}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Missing evidence">
        {missingEvidence.length === 0 ? (
          <EmptyState
            title="No missing required evidence"
            description="Every required evidence item for this student's verified skills is in place."
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {missingEvidence.map((item) => (
              <li key={`${item.skillCode}-${item.level}`} className="rounded-lg bg-amber-50 p-3">
                <span className="font-medium">
                  {item.skillName} ({item.level})
                </span>
                <span className="block text-zinc-600">{item.needed}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Opportunities & placement">
        {opportunities.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="This student has not applied to any opportunity."
          />
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm">
            {opportunities.map((item) => (
              <li key={item.applicationId} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{item.roleTitle}</span> · {item.companyName}
                </span>
                <span className="flex flex-wrap gap-2">
                  <Badge variant="outline">{item.stage.replace('_', ' ')}</Badge>
                  {item.offerOutcome ? (
                    <Badge variant="info">Offer {item.offerOutcome}</Badge>
                  ) : null}
                  {item.joiningOutcome ? (
                    <Badge variant="success">Joining {item.joiningOutcome}</Badge>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <MessageStudentModal
        open={messaging}
        studentId={student.userId}
        studentName={student.fullName}
        onClose={() => setMessaging(false)}
        onSent={() => setNotice(`Message sent to ${student.fullName}.`)}
      />
    </div>
  );
}
