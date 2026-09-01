'use client';

import { useEffect, useState } from 'react';
import type { IntegrityQueueItemDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { CircleCheck, ShieldAlert, X } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function IntegrityPage() {
  const [items, setItems] = useState<IntegrityQueueItemDto[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await api.onboarding.integrityQueue());
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load integrity queue.'));
  }, []);

  async function resolve(attemptId: string, resolution: 'CLEAR' | 'VOID') {
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
    }
    try {
      await api.onboarding.resolveIntegrity(attemptId, { resolution, reason: reason.trim() });
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Resolve failed.');
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={ShieldAlert}
        tone="inverse"
        title="Integrity review queue"
        description="Flagged attempts. Clear keeps the score; void blocks certificates."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Review reason</CardTitle>
          <CardDescription>Required for clear and void. Minimum 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Reason">
            <AdminInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>
        </CardContent>
      </Card>
      {items.length === 0 ? (
        <EmptyState icon={ShieldAlert}>No flagged attempts.</EmptyState>
      ) : (
        <DataTable headers={['Student', 'Flag', 'Status', 'Actions']}>
          {items.map((item) => (
            <TableRow key={item.attemptId}>
              <TableCell>
                <div className="font-medium">{item.studentName}</div>
                <div className="text-card-foreground/70">{item.studentEmail}</div>
              </TableCell>
              <TableCell>{item.integrityFlag}</TableCell>
              <TableCell>{item.status}</TableCell>
              <TableCell className="space-x-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void resolve(item.attemptId, 'CLEAR')}
                >
                  <CircleCheck data-icon="inline-start" />
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void resolve(item.attemptId, 'VOID')}
                >
                  <X data-icon="inline-start" />
                  Void
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
