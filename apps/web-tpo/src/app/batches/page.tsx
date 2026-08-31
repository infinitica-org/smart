'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type { BatchDto } from '@smart/contracts';
import { api } from '../../lib/api';
import { useRequireAuth } from '../../lib/auth';

export default function BatchesPage() {
  useRequireAuth();
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBatches(await api.onboarding.listBatches());
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load batches.'));
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.onboarding.createBatch({ name, code: code || undefined });
      setName('');
      setCode('');
      await load();
    } catch {
      setError('Could not create batch.');
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
          <CardDescription>Create rosters and invite students.</CardDescription>
        </CardHeader>
        <form onSubmit={onCreate} className="px-6 pb-6 flex gap-3 items-end">
          {error ? <Alert tone="danger" title={error} /> : null}
          <div className="flex-1">
            <Input
              label="Batch name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="w-48">
            <Input
              label="Batch code (optional)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </Card>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Name</th>
            <th className="py-2">Code</th>
            <th className="py-2">Members</th>
            <th className="py-2">Pending invites</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.batchId} className="border-b">
              <td className="py-2 font-medium">{batch.name}</td>
              <td className="py-2 font-mono text-xs">{batch.code ?? '—'}</td>
              <td className="py-2">{batch.memberCount}</td>
              <td className="py-2">{batch.pendingInviteCount}</td>
              <td className="py-2">
                <Link href={`/batches/${batch.batchId}`} className="underline">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
