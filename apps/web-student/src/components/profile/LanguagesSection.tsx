'use client';

import { useState } from 'react';
import { Languages, Plus, X } from 'lucide-react';
import type { CandidateLanguageDto } from '@smart/contracts';
import { queryKeys } from '@smart/api-client';
import { useQuery, useQueryClient } from '@smart/ui';
import { api } from '@/lib/api';
import { LanguageEntryCard } from '@/components/profile/LanguageEntryCard';
import {
  ProfileBentoEmptyPanel,
  ProfileSectionError,
  ProfileSectionHeader,
} from '@/components/profile/ProfileSectionChrome';
import { profilePrimaryButtonSmClass } from '@/lib/profile-ui-classes';
import { profileSectionMeta } from '@/lib/profile-sections';

const PROFICIENCY_OPTIONS = [
  'Elementary',
  'Limited Working',
  'Professional Working',
  'Full Professional',
  'Native or Bilingual',
];

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2.5 text-sm text-[var(--ds-text)] outline-none placeholder:text-[var(--ds-text-subtle)] focus:border-[var(--ds-green)]/40';

export function LanguagesSection() {
  const queryClient = useQueryClient();
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [language, setLanguage] = useState('');
  const [proficiency, setProficiency] = useState('Professional Working');

  const meta = profileSectionMeta('languages');

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.myLanguages() });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.myLanguages() });
    } catch (err: unknown) {
      setFormError((err as Error)?.message || 'Failed to delete language entry.');
    }
  };

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-4 font-[family-name:var(--tpo-font-sans)]"
      aria-label="Languages"
    >
      <ProfileSectionHeader
        title={meta.title}
        description={meta.description}
        action={
          !loading && languages.length > 0 ? (
            <button
              type="button"
              onClick={openCreateModal}
              className={`${profilePrimaryButtonSmClass} justify-center px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em]`}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              Add language
            </button>
          ) : null
        }
      />

      {error ? <ProfileSectionError>{error}</ProfileSectionError> : null}

      {loading ? <p className="text-sm text-[var(--ds-text-muted)]">Loading languages…</p> : null}

      {!loading && languages.length === 0 ? (
        <ProfileBentoEmptyPanel
          tipIcon={Languages}
          tipIconClassName="text-[#7c3aed]"
          tipTitle="Speak to global opportunities"
          tipBody="Employers often filter by language — add every language you can use professionally, with an honest proficiency level."
          emptyIcon={Languages}
          emptyTitle="No languages yet"
          emptyBody="When you add a language, it appears here with proficiency and a quick level indicator."
          actions={
            <button
              type="button"
              onClick={openCreateModal}
              className={`${profilePrimaryButtonSmClass} justify-center px-5 py-2.5 text-[13px]`}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              Add your first language
            </button>
          }
        />
      ) : null}

      {!loading && languages.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {languages.map((lang, index) => (
            <LanguageEntryCard
              key={lang.id}
              entry={lang}
              accentIndex={index}
              onEdit={() => openEditModal(lang)}
              onDelete={() => void handleDelete(lang.id)}
            />
          ))}
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_8px_30px_rgba(16,24,40,0.12)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-form-title"
          >
            <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)]/80 px-5 py-4">
              <h3
                id="language-form-title"
                className="text-[17px] font-semibold tracking-[-0.022em] text-[var(--ds-text)]"
              >
                {editingId ? 'Edit language' : 'Add language'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--ds-text-muted)] transition hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text)]"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
              {formError ? (
                <div className="rounded-[10px] border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-900">
                  {formError}
                </div>
              ) : null}

              <div>
                <label className="block text-[13px] font-medium text-[var(--ds-text-secondary)]">
                  Language <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English, German, Spanish"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[var(--ds-text-secondary)]">
                  Proficiency
                </label>
                <select
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value)}
                  className={fieldClass}
                >
                  {PROFICIENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--ds-border-subtle)]/80 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]/50 px-4 py-2 text-[13px] font-semibold text-[var(--ds-text)] transition hover:bg-[var(--ds-surface-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${profilePrimaryButtonSmClass} px-4 py-2 text-[13px] disabled:opacity-50`}
                >
                  {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add language'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
