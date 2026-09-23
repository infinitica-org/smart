'use client';

import type { GradingQueueItemDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { PenLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@smart/ui/button';
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

export default function GradingQueuePage() {
  const [items, setItems] = useState<GradingQueueItemDto[]>([]);
  const [selected, setSelected] = useState<GradingQueueItemDto | null>(null);
  const [score, setScore] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.onboarding.listGradingQueue({ page: 1, pageSize: 50 });
      setItems(result.items);
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load grading queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitGrade() {
    if (!selected) return;
    const parsed = Number(score);
    if (!Number.isFinite(parsed)) {
      setError('Enter a numeric score.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.onboarding.gradeResponse(selected.responseId, { score: parsed });
      setSuccess('Grade saved and attempt recalculated.');
      setSelected(null);
      setScore('');
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not save grade.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={PenLine}
        tone="inverse"
        title="Subjective grading queue"
        description="Human evaluation for subjective responses (T17)."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      {success ? <InlineAlert tone="info" title={success} /> : null}

      {selected ? (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">
            {selected.studentName} — L{selected.levelNumber}
          </p>
          <p className="text-sm text-muted-foreground">{selected.stem}</p>
          <p className="text-sm whitespace-pre-wrap">{selected.answerText}</p>
          <Field label={`Score (0–${selected.maxScore})`}>
            <AdminInput
              type="number"
              min={0}
              max={selected.maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="button" disabled={submitting} onClick={() => void submitGrade()}>
              Submit grade
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <EmptyState icon={PenLine}>Loading queue…</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState icon={PenLine}>No responses awaiting human grading.</EmptyState>
      ) : (
        <DataTable headers={['Student', 'Track', 'Level', 'Type', 'Max', 'Current', 'Actions']}>
          {items.map((item) => (
            <TableRow key={item.responseId}>
              <TableCell>{item.studentName}</TableCell>
              <TableCell>{item.trackCode}</TableCell>
              <TableCell>L{item.levelNumber}</TableCell>
              <TableCell>{item.itemType}</TableCell>
              <TableCell>{item.maxScore}</TableCell>
              <TableCell>{item.currentScore ?? '—'}</TableCell>
              <TableCell>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setSelected(item);
                    setScore('');
                  }}
                >
                  Grade
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
