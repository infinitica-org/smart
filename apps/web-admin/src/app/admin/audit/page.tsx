'use client';

import { useEffect, useState } from 'react';
import type { AuditLogDto, AuditLogSection } from '@smart/contracts';
import { Filter, ScrollText } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent } from '@smart/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smart/ui/tabs';
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

const SECTIONS: { value: AuditLogSection | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'TPO', label: 'TPO' },
  { value: 'SUPER_ADMIN', label: 'Super admin' },
];

function AuditTable({ rows }: { rows: AuditLogDto[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={ScrollText}>No matching audit events.</EmptyState>;
  }
  return (
    <DataTable headers={['When', 'Actor', 'Role', 'Action', 'Resource', 'Reason']}>
      {rows.map((row) => (
        <TableRow key={row.auditLogId}>
          <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
          <TableCell>{row.actorEmail ?? '—'}</TableCell>
          <TableCell>{row.actorRole ?? '—'}</TableCell>
          <TableCell className="font-medium">{row.action}</TableCell>
          <TableCell>
            {row.resourceType} {row.resourceId?.slice(0, 8)}
          </TableCell>
          <TableCell>{row.reasonCode}</TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}

export default function AuditPage() {
  const [section, setSection] = useState<AuditLogSection | 'ALL'>('ALL');
  const [rows, setRows] = useState<AuditLogDto[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load(nextSection: AuditLogSection | 'ALL', query?: string) {
    setRows(
      await api.onboarding.listAuditLogs({
        q: query || undefined,
        section: nextSection === 'ALL' ? undefined : nextSection,
      }),
    );
  }

  // Reloading is intentionally keyed only on the active tab — the search
  // box is applied on submit, not on every keystroke.
  useEffect(() => {
    load(section).catch(() => setError('Failed to load audit log.'));
  }, [section]);

  return (
    <PageStack>
      <PageHeader
        icon={ScrollText}
        title="Audit log"
        description="Every hold, verification decision, and candidate profile view is recorded with actor and reason. Rows older than 20 days are purged automatically."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              load(section, q.trim()).catch(() => setError('Search failed.'));
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
      <Tabs
        value={section}
        onValueChange={(value) => {
          setError(null);
          setSection(value as AuditLogSection | 'ALL');
        }}
      >
        <TabsList>
          {SECTIONS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            <AuditTable rows={rows} />
          </TabsContent>
        ))}
      </Tabs>
    </PageStack>
  );
}
