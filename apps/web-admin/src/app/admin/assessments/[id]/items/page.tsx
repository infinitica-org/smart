'use client';

import type { AdminItemDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { FileQuestion } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@smart/ui/button';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  InlineAlert,
  NativeSelect,
  PageStack,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function AssessmentItemsPage() {
  const params = useParams<{ id: string }>();
  const levelId = params.id;
  const [items, setItems] = useState<AdminItemDto[]>([]);
  const [competencies, setCompetencies] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    competencyId: '',
    itemType: 'MCQ_SINGLE',
    stem: '',
    modelAnswer: '',
    optionA: '',
    optionB: '',
    correctOption: 'A',
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { items: rows } = await api.onboarding.listAdminItems(levelId);
      setItems(rows);
      const levels = await api.onboarding.listAdminLevels();
      const level = levels.levels.find((row) => row.levelId === levelId);
      if (level) {
        const track = await api.catalog.track(level.trackCode);
        setCompetencies(
          track.competencies.map((comp) => ({
            id: comp.competencyId,
            name: comp.name,
          })),
        );
        const firstComp = track.competencies[0];
        if (!form.competencyId && firstComp) {
          setForm((prev) => ({ ...prev, competencyId: firstComp.competencyId }));
        }
      }
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load items.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [levelId]);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const options = form.itemType.startsWith('MCQ')
        ? [
            { label: 'A', text: form.optionA, isCorrect: form.correctOption === 'A' },
            { label: 'B', text: form.optionB, isCorrect: form.correctOption === 'B' },
          ]
        : [];
      await api.onboarding.createAdminItem(levelId, {
        competencyId: form.competencyId,
        itemType: form.itemType,
        stem: form.stem,
        modelAnswer: form.modelAnswer || undefined,
        options,
      });
      setSuccess('Item created.');
      setForm((prev) => ({ ...prev, stem: '', modelAnswer: '', optionA: '', optionB: '' }));
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not create item.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={FileQuestion}
        tone="inverse"
        title="Level items"
        description="Author questions, options, and model answers (T11)."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      {success ? <InlineAlert tone="info" title={success} /> : null}

      <h2 className="text-sm font-semibold">Create item</h2>
      <FormGrid>
        <Field label="Competency">
          <NativeSelect
            value={form.competencyId}
            onChange={(e) => setForm((prev) => ({ ...prev, competencyId: e.target.value }))}
          >
            {competencies.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Item type">
          <NativeSelect
            value={form.itemType}
            onChange={(e) => setForm((prev) => ({ ...prev, itemType: e.target.value }))}
          >
            {['MCQ_SINGLE', 'MCQ_MULTI', 'SHORT_ANSWER', 'SCENARIO_RESPONSE'].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Stem" className="col-span-full">
          <AdminInput
            value={form.stem}
            onChange={(e) => setForm((prev) => ({ ...prev, stem: e.target.value }))}
          />
        </Field>
        {form.itemType.startsWith('MCQ') ? (
          <>
            <Field label="Option A">
              <AdminInput
                value={form.optionA}
                onChange={(e) => setForm((prev) => ({ ...prev, optionA: e.target.value }))}
              />
            </Field>
            <Field label="Option B">
              <AdminInput
                value={form.optionB}
                onChange={(e) => setForm((prev) => ({ ...prev, optionB: e.target.value }))}
              />
            </Field>
            <Field label="Correct option">
              <NativeSelect
                value={form.correctOption}
                onChange={(e) => setForm((prev) => ({ ...prev, correctOption: e.target.value }))}
              >
                <option value="A">A</option>
                <option value="B">B</option>
              </NativeSelect>
            </Field>
          </>
        ) : (
          <Field label="Model answer" className="col-span-full">
            <AdminInput
              value={form.modelAnswer}
              onChange={(e) => setForm((prev) => ({ ...prev, modelAnswer: e.target.value }))}
            />
          </Field>
        )}
        <FormActions>
          <Button type="button" disabled={submitting} onClick={() => void handleCreate()}>
            Create item
          </Button>
        </FormActions>
      </FormGrid>

      {loading ? (
        <EmptyState icon={FileQuestion}>Loading items…</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState icon={FileQuestion}>No items for this level yet.</EmptyState>
      ) : (
        <DataTable headers={['Type', 'Competency', 'Stem', 'Active', 'Options']}>
          {items.map((item) => (
            <TableRow key={item.itemId}>
              <TableCell>{item.itemType}</TableCell>
              <TableCell>{item.competencyName}</TableCell>
              <TableCell className="max-w-md truncate">{item.stem}</TableCell>
              <TableCell>{item.active ? 'Yes' : 'No'}</TableCell>
              <TableCell>{item.options.length}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
