'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import type {
  CandidateBriefDto,
  CandidateViewReasonCode,
  GlobalStudentHitDto,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { Search, Users } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  FormGrid,
  InlineAlert,
  NativeSelect,
  PageStack,
  StatusBadge,
  TableCell,
  TableRow,
  controlButtonClassName,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function Page() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<GlobalStudentHitDto[] | null>(null);
  const [reason, setReason] = useState('');
  const [viewCode, setViewCode] = useState<CandidateViewReasonCode>('support_ticket');
  const [viewReason, setViewReason] = useState('');
  const [profile, setProfile] = useState<CandidateBriefDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(event: FormEvent) {
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
    <PageStack>
      <PageHeader
        icon={Users}
        title="Global student search"
        description="Lookup by name or email. Opening a profile requires a reason code and is audit-logged."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>
            Use at least 3 characters. Hold/release also needs a reason.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSearch}>
            <FilterBar>
              <Field label="Search">
                <AdminInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="At least 3 characters"
                />
              </Field>
              <Button type="submit" className={controlButtonClassName}>
                <Search data-icon="inline-start" />
                Search
              </Button>
            </FilterBar>
          </form>
          <FormGrid>
            <Field label="Reason (required to hold or release)">
              <AdminInput value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Field label="Profile view reason">
              <AdminInput value={viewReason} onChange={(e) => setViewReason(e.target.value)} />
            </Field>
            <Field label="View reason code">
              <NativeSelect
                value={viewCode}
                onChange={(e) => setViewCode(e.target.value as CandidateViewReasonCode)}
              >
                <option value="support_ticket">support_ticket</option>
                <option value="integrity_review">integrity_review</option>
                <option value="billing_dispute">billing_dispute</option>
                <option value="other">other</option>
              </NativeSelect>
            </Field>
          </FormGrid>
        </CardContent>
      </Card>
      {hits && hits.length === 0 ? (
        <EmptyState icon={Users}>No students matched.</EmptyState>
      ) : null}
      {hits && hits.length > 0 ? (
        <DataTable headers={['Name', 'Email', 'Institution', 'Invite', 'Access']}>
          {hits.map((hit) => (
            <TableRow key={hit.userId}>
              <TableCell className="font-medium">{hit.fullName}</TableCell>
              <TableCell>{hit.email}</TableCell>
              <TableCell>
                <Button variant="link" className="px-0" asChild>
                  <Link href={`/admin/institutions/${hit.institutionId}`}>
                    {hit.institutionName}
                  </Link>
                </Button>
              </TableCell>
              <TableCell>{hit.inviteStatus ?? 'NONE'}</TableCell>
              <TableCell className="space-x-2">
                <StatusBadge status={hit.heldAt ? 'On hold' : 'Active'} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void (async () => {
                      if (viewReason.trim().length < 8) {
                        setError('Enter a view reason of at least 8 characters.');
                        return;
                      }
                      try {
                        setProfile(
                          await api.onboarding.viewCandidateProfile(hit.userId, {
                            reasonCode: viewCode,
                            reason: viewReason.trim(),
                          }),
                        );
                      } catch (err) {
                        setError(isSmartApiError(err) ? err.message : 'Profile view failed.');
                      }
                    })();
                  }}
                >
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
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
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      ) : null}
      {profile ? (
        <Card>
          <CardHeader>
            <CardTitle>{profile.fullName}</CardTitle>
            <CardDescription>This view is logged · {profile.viewedAt}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div>
              {profile.email} · {profile.institutionName}
            </div>
            <div>Invite {profile.inviteStatus ?? 'NONE'}</div>
            <div>{profile.heldAt ? `On hold: ${profile.heldReason}` : 'Access active'}</div>
            <div>
              Skills {profile.verifiedSkillCount}/{profile.skillClaimCount} verified · Projects{' '}
              {profile.projectCount}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </PageStack>
  );
}
