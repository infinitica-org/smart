'use client';

import type { AdminLevelDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
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

type TrackOption = { trackId: string; code: string; name: string };

export default function AssessmentsPage() {
  const [levels, setLevels] = useState<AdminLevelDto[]>([]);
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    trackId: '',
    levelNumber: '1',
    name: '',
    format: 'MCQ',
    durationMinutes: '60',
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [{ levels: levelRows }, trackRows] = await Promise.all([
        api.onboarding.listAdminLevels(),
        api.catalog.tracks(),
      ]);
      setLevels(levelRows);
      setTracks(
        trackRows.map((track) => ({
          trackId: track.trackId,
          code: track.code,
          name: track.name,
        })),
      );
      const firstTrack = trackRows[0];
      if (!form.trackId && firstTrack) {
        setForm((prev) => ({ ...prev, trackId: firstTrack.trackId }));
      }
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load assessment levels.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.onboarding.createAdminLevel({
        trackId: form.trackId,
        levelNumber: Number(form.levelNumber),
        name: form.name.trim(),
        format: form.format as AdminLevelDto['format'],
        durationMinutes: Number(form.durationMinutes),
      });
      setSuccess('Level created.');
      setForm((prev) => ({ ...prev, name: '' }));
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not create level.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(level: AdminLevelDto) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.onboarding.updateAdminLevel(level.levelId, {
        name: level.name,
        durationMinutes: level.durationMinutes,
      });
      setSuccess('Level updated.');
      setEditingId(null);
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not update level.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={ClipboardList}
        tone="inverse"
        title="Assessment levels"
        description="Author track levels tied to competencies (T10)."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      {success ? <InlineAlert tone="info" title={success} /> : null}

      <h2 className="text-sm font-semibold">Create level</h2>
      <FormGrid>
        <Field label="Track">
          <NativeSelect
            value={form.trackId}
            onChange={(e) => setForm((prev) => ({ ...prev, trackId: e.target.value }))}
          >
            {tracks.map((track) => (
              <option key={track.trackId} value={track.trackId}>
                {track.code} — {track.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Level number">
          <AdminInput
            type="number"
            min={1}
            max={5}
            value={form.levelNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, levelNumber: e.target.value }))}
          />
        </Field>
        <Field label="Name">
          <AdminInput
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </Field>
        <Field label="Format">
          <NativeSelect
            value={form.format}
            onChange={(e) => setForm((prev) => ({ ...prev, format: e.target.value }))}
          >
            {['MCQ', 'SANDBOX', 'AUDIO_BARS', 'DEFENSE', 'CAPSTONE'].map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Duration (minutes)">
          <AdminInput
            type="number"
            min={1}
            max={480}
            value={form.durationMinutes}
            onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
          />
        </Field>
        <FormActions>
          <Button type="button" disabled={submitting} onClick={() => void handleCreate()}>
            Create level
          </Button>
        </FormActions>
      </FormGrid>

      {loading ? (
        <EmptyState icon={ClipboardList}>Loading levels…</EmptyState>
      ) : levels.length === 0 ? (
        <EmptyState icon={ClipboardList}>No levels yet.</EmptyState>
      ) : (
        <DataTable headers={['Track', 'Level', 'Name', 'Format', 'Duration', 'Items', 'Actions']}>
          {levels.map((level) => (
            <TableRow key={level.levelId}>
              <TableCell>{level.trackCode}</TableCell>
              <TableCell>L{level.levelNumber}</TableCell>
              <TableCell>
                {editingId === level.levelId ? (
                  <AdminInput
                    value={level.name}
                    onChange={(e) =>
                      setLevels((rows) =>
                        rows.map((row) =>
                          row.levelId === level.levelId ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                  />
                ) : (
                  level.name
                )}
              </TableCell>
              <TableCell>{level.format}</TableCell>
              <TableCell>
                {editingId === level.levelId ? (
                  <AdminInput
                    type="number"
                    value={String(level.durationMinutes)}
                    onChange={(e) =>
                      setLevels((rows) =>
                        rows.map((row) =>
                          row.levelId === level.levelId
                            ? { ...row, durationMinutes: Number(e.target.value) }
                            : row,
                        ),
                      )
                    }
                  />
                ) : (
                  `${level.durationMinutes} min`
                )}
              </TableCell>
              <TableCell>{level.itemCount}</TableCell>
              <TableCell className="flex flex-wrap gap-2">
                <Link href={`/admin/assessments/${level.levelId}/items`}>
                  <Button type="button" size="sm" variant="outline">
                    Items
                  </Button>
                </Link>
                {editingId === level.levelId ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting}
                      onClick={() => void handleUpdate(level)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(level.levelId)}
                  >
                    Edit
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
