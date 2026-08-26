'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type { InstitutionDto } from '@smart/contracts';
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

export default function InstitutionsPage() {
  useRequireAuth();
  const [institutions, setInstitutions] = useState<InstitutionDto[]>([]);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setInstitutions(await api.onboarding.listInstitutions());
  }

  useEffect(() => {
    load().catch((err) => setError(formatApiError(err, 'Failed to load institutions.')));
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Institutions</CardTitle>
          <CardDescription>Create institutions and invite TPO admins.</CardDescription>
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
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Name</th>
            <th className="py-2">Domain</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {institutions.map((inst) => (
            <tr key={inst.institutionId} className="border-b">
              <td className="py-2">{inst.name}</td>
              <td className="py-2">{inst.domain}</td>
              <td className="py-2">
                <Link href={`/admin/institutions/${inst.institutionId}`} className="underline">
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
