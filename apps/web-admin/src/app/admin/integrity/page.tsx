'use client';

import { useEffect, useState } from 'react';
import type { IntegrityQueueItemDto, IntegrityQueueStatus } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { CircleCheck, ShieldAlert, TriangleAlert, X } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@smart/ui/tabs';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  InlineAlert,
  PageStack,
  SeverityBadge,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

type Resolution = 'CLEAR' | 'VOID' | 'ESCALATE';

export default function IntegrityPage() {
  const [status, setStatus] = useState<IntegrityQueueStatus>('PENDING');
  const [items, setItems] = useState<IntegrityQueueItemDto[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load(forStatus: IntegrityQueueStatus) {
    setItems(await api.onboarding.integrityQueue(forStatus));
  }

  useEffect(() => {
    load(status).catch(() => setError('Failed to load integrity queue.'));
  }, [status]);

  async function resolve(attemptId: string, resolution: Resolution) {
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
    }
    try {
      await api.onboarding.resolveIntegrity(attemptId, { resolution, reason: reason.trim() });
      await load(status);
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
        description="Flagged attempts. Dismiss keeps the score; Confirm blocks certificates; Escalate flags it for further review — escalated cases move to the Escalated tab so they stay visible instead of disappearing."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Tabs value={status} onValueChange={(value) => setStatus(value as IntegrityQueueStatus)}>
        <TabsList>
          <TabsTrigger value="PENDING">
            <ShieldAlert />
            Pending
          </TabsTrigger>
          <TabsTrigger value="ESCALATED">
            <TriangleAlert />
            Escalated
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <CardHeader>
          <CardTitle>Review reason</CardTitle>
          <CardDescription>
            Required for dismiss, confirm, and escalate. Minimum 8 characters.
          </CardDescription>
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
        <EmptyState icon={ShieldAlert}>
          {status === 'ESCALATED' ? 'No escalated attempts.' : 'No flagged attempts.'}
        </EmptyState>
      ) : (
        <DataTable headers={['Student', 'Flag', 'Severity', 'Status', 'Actions']}>
          {items.map((item) => (
            <TableRow key={item.attemptId}>
              <TableCell>
                <div className="font-medium">{item.studentName}</div>
                <div className="text-card-foreground/70">{item.studentEmail}</div>
              </TableCell>
              <TableCell>
                <div>{item.integrityFlag}</div>
                {item.flagReason ? (
                  <div className="text-card-foreground/70">{item.flagReason}</div>
                ) : null}
              </TableCell>
              <TableCell>
                <SeverityBadge severity={item.severity} />
              </TableCell>
              <TableCell>{item.status}</TableCell>
              <TableCell className="space-x-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void resolve(item.attemptId, 'CLEAR')}
                >
                  <CircleCheck data-icon="inline-start" />
                  Dismiss
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void resolve(item.attemptId, 'VOID')}
                >
                  <X data-icon="inline-start" />
                  Confirm
                </Button>
                {item.integrityFlag === 'ESCALATED' ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void resolve(item.attemptId, 'ESCALATE')}
                  >
                    <TriangleAlert data-icon="inline-start" />
                    Escalate
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
