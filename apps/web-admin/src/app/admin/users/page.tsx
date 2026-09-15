'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type {
  CandidateBriefDto,
  CandidateViewReasonCode,
  GlobalStudentHitDto,
  GlobalStudentSearchQuery,
  InstitutionDto,
  SkillClaimStatus,
  SkillLibraryResponse,
  SkillProficiency,
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

// Record<SkillProficiency, true> (not a plain `SkillProficiency[]` literal) so TS
// flags both directions if `SkillProficiency` ever changes: a removed value makes
// this an excess-property error, a new value makes it a missing-property error.
// A plain array annotation only catches typos in existing entries, not that kind
// of drift.
const PROFICIENCY_MEMBERS: Record<SkillProficiency, true> = {
  BEGINNER: true,
  INTERMEDIATE: true,
  ADVANCED: true,
  PROFESSIONAL: true,
};
const PROFICIENCIES = Object.keys(PROFICIENCY_MEMBERS) as SkillProficiency[];
const VERIFICATION_STATUSES: SkillClaimStatus[] = [
  'DECLARED',
  'VERIFIED',
  'BEGINNER_REATTEMPT',
  'LOCKED',
];

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

export default function Page() {
  const [q, setQ] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [skillCode, setSkillCode] = useState('');
  const [proficiency, setProficiency] = useState<SkillProficiency | ''>('');
  const [verificationStatus, setVerificationStatus] = useState<SkillClaimStatus | ''>('');
  const [institutions, setInstitutions] = useState<InstitutionDto[]>([]);
  const [skillLibrary, setSkillLibrary] = useState<SkillLibraryResponse | null>(null);
  const [hits, setHits] = useState<GlobalStudentHitDto[] | null>(null);
  const [reason, setReason] = useState('');
  const [viewCode, setViewCode] = useState<CandidateViewReasonCode>('support_ticket');
  const [viewReason, setViewReason] = useState('');
  const [profile, setProfile] = useState<CandidateBriefDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.onboarding
      .listInstitutions()
      .then(setInstitutions)
      .catch((err) => setError(formatApiError(err, 'Failed to load institutions.')));
    api.catalog
      .skillLibrary()
      .then(setSkillLibrary)
      .catch((err) => setError(formatApiError(err, 'Failed to load the skill library.')));
  }, []);

  function buildQuery(): GlobalStudentSearchQuery | null {
    const trimmed = q.trim();
    const hasFilter =
      institutionId !== '' || skillCode !== '' || proficiency !== '' || verificationStatus !== '';
    if (trimmed.length === 0 && !hasFilter) {
      setError('Enter a search term or choose at least one filter.');
      return null;
    }
    if (trimmed.length > 0 && trimmed.length < 3) {
      setError('Enter at least 3 characters to search by name or email.');
      return null;
    }
    return {
      q: trimmed || undefined,
      institutionId: institutionId || undefined,
      skillCode: skillCode || undefined,
      proficiency: proficiency || undefined,
      verificationStatus: verificationStatus || undefined,
    };
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const query = buildQuery();
    if (!query) {
      setHits(null);
      return;
    }
    try {
      setHits(await api.onboarding.searchStudents(query));
    } catch (err) {
      setHits(null);
      setError(formatApiError(err, 'Search failed. Use at least 3 characters or add a filter.'));
    }
  }

  async function refresh() {
    const query = buildQuery();
    if (!query) return;
    setHits(await api.onboarding.searchStudents(query));
  }

  return (
    <PageStack>
      <PageHeader
        icon={Users}
        title="Global student search"
        description="Search by name/email, institution, skill, proficiency, or verification status. Opening a profile requires a reason code and is audit-logged."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>
            Combine a name/email search with capability filters, or leave the search box empty and
            filter only. Hold/release also needs a reason.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSearch}>
            <FilterBar>
              <Field label="Search">
                <AdminInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name or email (optional with filters)"
                />
              </Field>
              <Field label="Institution">
                <NativeSelect
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                >
                  <option value="">All institutions</option>
                  {institutions.map((institution) => (
                    <option key={institution.institutionId} value={institution.institutionId}>
                      {institution.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Skill">
                <NativeSelect value={skillCode} onChange={(e) => setSkillCode(e.target.value)}>
                  <option value="">All skills</option>
                  {skillLibrary?.categories.map((category) => (
                    <optgroup key={category.id} label={category.name}>
                      {category.skills.map((skill) => (
                        <option key={skill.code} value={skill.code}>
                          {skill.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Proficiency">
                <NativeSelect
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value as SkillProficiency | '')}
                >
                  <option value="">Any proficiency</option>
                  {PROFICIENCIES.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Verification status">
                <NativeSelect
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value as SkillClaimStatus | '')}
                >
                  <option value="">Any status</option>
                  {VERIFICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </NativeSelect>
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
                        await refresh();
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
