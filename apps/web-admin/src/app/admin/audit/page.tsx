'use client';

import { useEffect, useState } from 'react';
import type { AuditLogDto } from '@smart/contracts';
import { Filter, ScrollText } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
  controlButtonClassName,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function AuditPage() {
  const [rows, setRows] = useState<AuditLogDto[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load(query?: string) {
    setRows(await api.onboarding.listAuditLogs({ q: query || undefined }));
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load audit log.'));
  }, []);

  return (
    <PageStack>
      <PageHeader
        icon={ScrollText}
        title="Audit log"
        description="Every hold, verification decision, and candidate profile view is recorded with actor and reason."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              load(q.trim()).catch(() => setError('Search failed.'));
            }}
          >
            <FilterBar>
              <Field label="Search">
                <AdminInput value={q} onChange={(e) => setQ(e.target.value)} />
              </Field>
              <Button type="submit" variant="outline" className={controlButtonClassName}>
                <Filter data-icon="inline-start" />
                Filter
              </Button>
            </FilterBar>
          </form>
        </CardContent>
      </Card>
      {rows.length === 0 ? (
        <EmptyState icon={ScrollText}>No matching audit events.</EmptyState>
      ) : (
        <DataTable headers={['When', 'Actor', 'Action', 'Resource', 'Reason']}>
          {rows.map((row) => (
            <TableRow key={row.auditLogId}>
              <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
              <TableCell>{row.actorEmail ?? '—'}</TableCell>
              <TableCell className="font-medium">{row.action}</TableCell>
              <TableCell>
                {row.resourceType} {row.resourceId?.slice(0, 8)}
              </TableCell>
              <TableCell>{row.reasonCode}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
