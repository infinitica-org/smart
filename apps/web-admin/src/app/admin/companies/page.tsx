'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanyDto, InstitutionListStatus } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { Building2, Filter, Plus } from 'lucide-react';
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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [sector, setSector] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<InstitutionListStatus | ''>('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setCompanies(
      await api.onboarding.listCompanies({
        q: q.trim() || undefined,
        status: status || undefined,
      }),
    );
  }

  useEffect(() => {
    load().catch((err) =>
      setError(isSmartApiError(err) ? err.message : 'Failed to load companies.'),
    );
  }, []);

  return (
    <PageStack>
      <PageHeader
        icon={Building2}
        title="Companies"
        description="Name, industry domain (Software/IT), and sector — not an email hostname."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Add company</CardTitle>
          <CardDescription>Create a partner tenant, then open it to manage access.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                try {
                  await api.onboarding.createCompany({
                    name,
                    domain: domain.trim() || undefined,
                    sector: sector || undefined,
                  });
                  setName('');
                  setDomain('');
                  setSector('');
                  await load();
                } catch (err) {
                  setError(isSmartApiError(err) ? err.message : 'Could not create company.');
                }
              })();
            }}
          >
            <FormGrid>
              <Field label="Name">
                <AdminInput value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Industry domain">
                <AdminInput
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Software/IT"
                />
              </Field>
              <Field label="Sector">
                <AdminInput value={sector} onChange={(e) => setSector(e.target.value)} />
              </Field>
              <FormActions>
                <Button type="submit" className={controlButtonClassName}>
                  <Plus data-icon="inline-start" />
                  Add company
                </Button>
              </FormActions>
            </FormGrid>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              load().catch(() => setError('Filter failed.'));
            }}
          >
            <FilterBar>
              <Field label="Search">
                <AdminInput value={q} onChange={(e) => setQ(e.target.value)} />
              </Field>
              <Field label="Status">
                <NativeSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InstitutionListStatus | '')}
                  aria-label="Status"
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="HELD">Held</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </NativeSelect>
              </Field>
              <Button type="submit" variant="outline" className={controlButtonClassName}>
                <Filter data-icon="inline-start" />
                Filter
              </Button>
            </FilterBar>
          </form>
        </CardContent>
      </Card>

      {companies.length === 0 ? (
        <EmptyState icon={Building2}>No companies match.</EmptyState>
      ) : (
        <DataTable headers={['Name', 'Industry', 'Plan', 'Status']}>
          {companies.map((company) => (
            <TableRow key={company.companyId}>
              <TableCell>
                <Button variant="link" className="px-0" asChild>
                  <Link href={`/admin/companies/${company.companyId}`}>{company.name}</Link>
                </Button>
              </TableCell>
              <TableCell>{company.domain ?? '—'}</TableCell>
              <TableCell>{company.planCode}</TableCell>
              <TableCell>
                <StatusBadge
                  status={
                    company.deactivatedAt ? 'Deactivated' : company.heldAt ? 'On hold' : 'Active'
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
