'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type { GlobalStudentHitDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { api } from '../../../lib/api';
import { useRequireAuth } from '../../../lib/auth';

export default function Page() {
  useRequireAuth();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<GlobalStudentHitDto[] | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      setHits(await api.onboarding.searchStudents(q.trim()));
    } catch (err) {
      setHits(null);
      setError(isSmartApiError(err) ? err.message : 'Search failed. Use at least 3 characters.');
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Global student search</CardTitle>
          <CardDescription>
            Lookup by name or email across institutions. Full profile access stays reason-gated
            (SA-T06).
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSearch} className="px-6 pb-6 flex gap-3 items-end max-w-lg">
          <div className="flex-1">
            <Input
              label="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="At least 3 characters"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        <div className="px-6 pb-6 max-w-lg">
          <Input
            label="Reason (required to hold or release)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Card>
      {error ? <Alert tone="danger" title={error} /> : null}
      {hits && hits.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No students matched.</p>
      ) : null}
      {hits && hits.length > 0 ? (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Institution</th>
              <th className="py-2">Invite</th>
              <th className="py-2">Access</th>
            </tr>
          </thead>
          <tbody>
            {hits.map((hit) => (
              <tr key={hit.userId} className="border-b">
                <td className="py-2">{hit.fullName}</td>
                <td className="py-2">{hit.email}</td>
                <td className="py-2">
                  <Link href={`/admin/institutions/${hit.institutionId}`} className="underline">
                    {hit.institutionName}
                  </Link>
                </td>
                <td className="py-2">{hit.inviteStatus ?? 'NONE'}</td>
                <td className="py-2">
                  {hit.heldAt ? 'On hold' : 'Active'}{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      void (async () => {
                        if (reason.trim().length < 8) {
                          setError('Enter a reason of at least 8 characters.');
                          return;
                        }
                        try {
                          if (hit.heldAt) {
                            await api.onboarding.releaseStudentHold(hit.userId, {
                              reason: reason.trim(),
                            });
                          } else {
                            await api.onboarding.holdStudent(hit.userId, {
                              reason: reason.trim(),
                            });
                          }
                          setHits(await api.onboarding.searchStudents(q.trim()));
                        } catch (err) {
                          setError(isSmartApiError(err) ? err.message : 'Hold update failed.');
                        }
                      })();
                    }}
                  >
                    {hit.heldAt ? 'Release' : 'Hold'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
