'use client';

import { useState } from 'react';
import { Languages, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { CandidateLanguageDto } from '@smart/contracts';
import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';

const PROFICIENCY_OPTIONS = [
  'Elementary',
  'Limited Working',
  'Professional Working',
  'Full Professional',
  'Native or Bilingual',
];

export function LanguagesSection() {
  const {
    data: languages = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.myLanguages(),
    queryFn: () => api.users.listLanguages(),
    staleTime: 60_000,
  });
  const error = queryError
    ? (queryError as Error).message || 'Failed to load language proficiencies.'
    : null;

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [language, setLanguage] = useState('');
  const [proficiency, setProficiency] = useState('Professional Working');

  const fetchLanguages = async () => {
    await refetch();
  };

  const openCreateModal = () => {
    setEditingId(null);
    setLanguage('');
    setProficiency('Professional Working');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CandidateLanguageDto) => {
    setEditingId(item.id);
    setLanguage(item.language);
    setProficiency(item.proficiency);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!language.trim()) {
      setFormError('Language name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const payload = {
        language: language.trim(),
        proficiency,
      };

      if (editingId) {
        await api.users.updateLanguage(editingId, payload);
      } else {
        await api.users.createLanguage(payload);
      }

      closeModal();
      await fetchLanguages();
    } catch (err: unknown) {
      setFormError((err as Error)?.message || 'Failed to save language entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this language entry?')) return;
    try {
      await api.users.deleteLanguage(id);
      await fetchLanguages();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to delete language entry.');
    }
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="languages-heading">
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="languages-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Languages Known
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Languages you speak and your proficiency level.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Language
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading languages…</p>
      ) : languages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/50 p-8 text-center">
          <Languages className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-foreground/80">No languages added yet</p>
          <p className="text-xs text-muted-foreground">
            Add your spoken languages for global job opportunities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {languages.map((lang) => (
            <div
              key={lang.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/10 text-foreground">
                  <Languages className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{lang.language}</h3>
                  <span className="inline-block mt-0.5 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                    {lang.proficiency}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(lang)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Edit Language"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(lang.id)}
                  className="rounded-lg p-1.5 text-red-600/80 hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="Delete Language"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Edit Language' : 'Add Language'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              {formError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground/80">
                  Language <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English, German, Spanish"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80">Proficiency</label>
                <select
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                >
                  {PROFICIENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/80 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
