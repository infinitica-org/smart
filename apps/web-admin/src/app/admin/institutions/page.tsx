'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type { InstitutionDto, InstitutionListStatus, PlanCode } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { api } from '../../../lib/api';
import { useRequireAuth } from '../../../lib/auth';

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
  useRequireAuth();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, []);

  async function onCreate(event: React.FormEvent) {
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
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Institutions</CardTitle>
          <CardDescription>
            Create, search, and open a tenant to manage students and access.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onCreate} className="px-6 pb-6 grid gap-3 max-w-lg">
          {error ? <Alert tone="danger" title={error} /> : null}
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="psgtech.ac.in or localhost"
            required
          />
          <Button type="submit">Create institution</Button>
        </form>
      </Card>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-48 flex-1">
          <Input
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or domain"
          />
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-[var(--text-muted)]">Plan</span>
          <select
            className="h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3"
            value={planCode}
            onChange={(e) => setPlanCode(e.target.value as PlanCode | '')}
          >
            <option value="">All plans</option>
            <option value="FREE">Free</option>
            <option value="BASIC">Basic</option>
            <option value="PRO">Pro</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-[var(--text-muted)]">Status</span>
          <select
            className="h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3"
            value={status}
            onChange={(e) => setStatus(e.target.value as InstitutionListStatus | '')}
          >
            <option value="">Active + on hold</option>
            <option value="ACTIVE">Active</option>
            <option value="HELD">On hold</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setError(null);
            load().catch((err) => setError(formatApiError(err, 'Failed to load institutions.')));
          }}
        >
          Apply filters
        </Button>
      </div>

      {institutions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No institutions match these filters.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Name</th>
              <th className="py-2">Domain</th>
              <th className="py-2">Plan</th>
              <th className="py-2">Students</th>
              <th className="py-2">Pending invites</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((inst) => (
              <tr key={inst.institutionId} className="border-b">
                <td className="py-2">{inst.name}</td>
                <td className="py-2">{inst.domain}</td>
                <td className="py-2">{inst.planCode}</td>
                <td className="py-2">{inst.studentCount}</td>
                <td className="py-2">{inst.invitePendingCount}</td>
                <td className="py-2">{statusLabel(inst)}</td>
                <td className="py-2">
                  <Link href={`/admin/institutions/${inst.institutionId}`} className="underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
