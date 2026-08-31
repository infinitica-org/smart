'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type { InstitutionStudentDto, StudentInviteFilter } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { api } from '../../lib/api';
import { useRequireAuth } from '../../lib/auth';

export default function TpoStudentsPage() {
  useRequireAuth();
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [q, setQ] = useState('');
  const [inviteStatus, setInviteStatus] = useState<StudentInviteFilter | ''>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setStudents(
      await api.onboarding.listTpoStudents({
        q: q.trim() || undefined,
        inviteStatus: inviteStatus || undefined,
      }),
    );
  }

  useEffect(() => {
    load().catch((err) =>
      setError(isSmartApiError(err) ? err.message : 'Failed to load students.'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <Link href="/batches" className="text-sm underline">
        Batches
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Hold a student to freeze their session immediately. They see a full-screen pause until
            you release them. A reason is required.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-4 grid gap-3 max-w-lg">
          {error ? <Alert tone="danger" title={error} /> : null}
          {message ? <Alert tone="info" title={message} /> : null}
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="grid gap-1 text-sm">
            <span className="text-[var(--text-muted)]">Invite status</span>
            <select
              className="h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3"
              value={inviteStatus}
              onChange={(e) => setInviteStatus(e.target.value as StudentInviteFilter | '')}
            >
              <option value="">All</option>
              <option value="PENDING">Invite sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="NONE">No invite</option>
            </select>
          </label>
          <Input
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setError(null);
              load().catch((err) =>
                setError(isSmartApiError(err) ? err.message : 'Failed to load students.'),
              );
            }}
          >
            Filter
          </Button>
        </div>
      </Card>
      {students.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No students match these filters.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Batch</th>
              <th className="py-2">Invite</th>
              <th className="py-2">Access</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.userId} className="border-b">
                <td className="py-2">{student.fullName}</td>
                <td className="py-2">{student.email}</td>
                <td className="py-2">{student.batchName ?? '—'}</td>
                <td className="py-2">{student.inviteStatus ?? 'NONE'}</td>
                <td className="py-2">
                  {student.heldAt ? 'On hold' : 'Active'}{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      void (async () => {
                        if (reason.trim().length < 8) {
                          setError('Enter a reason of at least 8 characters.');
                          return;
                        }
                        setError(null);
                        try {
                          if (student.heldAt) {
                            await api.onboarding.releaseTpoStudentHold(student.userId, {
                              reason: reason.trim(),
                            });
                            setMessage('Student hold released.');
                          } else {
                            await api.onboarding.holdTpoStudent(student.userId, {
                              reason: reason.trim(),
                            });
                            setMessage('Student session is on hold.');
                          }
                          await load();
                        } catch (err) {
                          setError(isSmartApiError(err) ? err.message : 'Could not update hold.');
                        }
                      })();
                    }}
                  >
                    {student.heldAt ? 'Release' : 'Hold'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
