'use client';

import { useEffect, useState } from 'react';
import type { ProjectReviewDetailDto, ProjectReviewQueueItemDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { ClipboardList } from 'lucide-react';
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

export default function ProjectReviewPage() {
  const [items, setItems] = useState<ProjectReviewQueueItemDto[]>([]);
  const [selected, setSelected] = useState<ProjectReviewDetailDto | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await api.onboarding.projectReviewQueue();
    setItems(res.items);
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load project review queue.'));
  }, []);

  async function openDetail(projectId: string) {
    setError(null);
    try {
      setSelected(await api.onboarding.projectReviewDetail(projectId));
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load project detail.');
    }
  }

  async function resolve(projectId: string, resolution: 'APPROVE' | 'REJECT') {
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
    }
    try {
      await api.onboarding.resolveProjectReview(projectId, {
        resolution,
        reason: reason.trim(),
      });
      setSelected(null);
      setReason('');
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Resolve failed.');
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={ClipboardList}
        tone="inverse"
        title="Project defense review"
        description="Human review for flagged project defenses. Approve verifies the project; reject is reviewer-only."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Review reason</CardTitle>
          <CardDescription>Required for approve and reject (min 8 characters).</CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Reason">
            <AdminInput value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </CardContent>
      </Card>
      {items.length === 0 ? (
        <EmptyState icon={ClipboardList}>No projects in review.</EmptyState>
      ) : (
        <DataTable headers={['Project', 'Student', 'Status', 'Score', '']}>
          {items.map((item) => (
            <TableRow key={item.projectId}>
              <TableCell>{item.title}</TableCell>
              <TableCell>{item.studentName}</TableCell>
              <TableCell>{item.status}</TableCell>
              <TableCell>{item.score ?? '—'}</TableCell>
              <TableCell>
                <Button type="button" variant="outline" onClick={() => openDetail(item.projectId)}>
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>{selected.queue.title}</CardTitle>
            <CardDescription>{selected.verificationExplanation}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Defense score: {selected.grade.defenseScore} · Ownership concern:{' '}
              {selected.grade.ownershipConcern ? 'yes' : 'no'}
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={() => resolve(selected.queue.projectId, 'APPROVE')}>
                Approve
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => resolve(selected.queue.projectId, 'REJECT')}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </PageStack>
  );
}
