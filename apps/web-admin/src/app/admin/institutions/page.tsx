'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import type { InstitutionDto, InstitutionListStatus, PlanCode } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { Filter, GraduationCap, Plus } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  FormActions,
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

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

function statusLabel(institution: InstitutionDto): string {
  if (institution.deactivatedAt) return 'Deactivated';
  if (institution.heldAt) return 'On hold';
  return 'Active';
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<InstitutionDto[]>([]);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [q, setQ] = useState('');
  const [planCode, setPlanCode] = useState<PlanCode | ''>('');
  const [status, setStatus] = useState<InstitutionListStatus | ''>('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setInstitutions(
      await api.onboarding.listInstitutions({
        q: q.trim() || undefined,
        planCode: planCode || undefined,
        status: status || undefined,
      }),
    );
  }

  useEffect(() => {
    load().catch((err) => setError(formatApiError(err, 'Failed to load institutions.')));
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.onboarding.createInstitution({
        name: name.trim(),
        domain: domain.trim(),
      });
      setName('');
      setDomain('');
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Could not create institution.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={GraduationCap}
        title="Institutions"
        description="Create, search, and open a tenant to manage students and access."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Create institution</CardTitle>
          <CardDescription>Name and email domain for the new tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate}>
            <FormGrid>
              <Field label="Name">
                <AdminInput value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Domain">
                <AdminInput
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="psgtech.ac.in or localhost"
                  required
                />
              </Field>
              <FormActions>
                <Button type="submit" className={controlButtonClassName}>
                  <Plus data-icon="inline-start" />
                  Create institution
                </Button>
              </FormActions>
            </FormGrid>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Filter by name, plan, or access status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              load().catch((err) => setError(formatApiError(err, 'Failed to load institutions.')));
            }}
          >
            <FilterBar>
              <Field label="Search">
                <AdminInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name or domain"
                />
              </Field>
              <Field label="Plan">
                <NativeSelect
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value as PlanCode | '')}
                >
                  <option value="">All plans</option>
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                </NativeSelect>
              </Field>
              <Field label="Status">
                <NativeSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InstitutionListStatus | '')}
                >
                  <option value="">Active + on hold</option>
                  <option value="ACTIVE">Active</option>
                  <option value="HELD">On hold</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </NativeSelect>
              </Field>
              <Button type="submit" variant="outline" className={controlButtonClassName}>
                <Filter data-icon="inline-start" />
                Apply filters
              </Button>
            </FilterBar>
          </form>
        </CardContent>
      </Card>

      {institutions.length === 0 ? (
        <EmptyState icon={GraduationCap}>No institutions match these filters.</EmptyState>
      ) : (
        <DataTable
          headers={['Name', 'Domain', 'Plan', 'Students', 'Pending invites', 'Status', '']}
        >
          {institutions.map((inst) => (
            <TableRow key={inst.institutionId}>
              <TableCell className="font-medium">{inst.name}</TableCell>
              <TableCell>{inst.domain}</TableCell>
              <TableCell>
                <BadgeLike>{inst.planCode}</BadgeLike>
              </TableCell>
              <TableCell>{inst.studentCount}</TableCell>
              <TableCell>{inst.invitePendingCount}</TableCell>
              <TableCell>
                <StatusBadge status={statusLabel(inst)} />
              </TableCell>
              <TableCell>
                <Button variant="link" className="px-0" asChild>
                  <Link href={`/admin/institutions/${inst.institutionId}`}>Manage</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}

function BadgeLike({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}
