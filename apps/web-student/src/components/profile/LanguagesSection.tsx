'use client';

import { useEffect, useState } from 'react';
import { Languages, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { CandidateLanguageDto } from '@smart/contracts';
import { api } from '@/lib/api';

const PROFICIENCY_OPTIONS = [
  'Elementary',
  'Limited Working',
  'Professional Working',
  'Full Professional',
  'Native or Bilingual',
];

export function LanguagesSection() {
  const [languages, setLanguages] = useState<CandidateLanguageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [language, setLanguage] = useState('');
  const [proficiency, setProficiency] = useState('Professional Working');

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.users.listLanguages();
      setLanguages(res);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load language proficiencies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLanguages();
  }, []);

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
          <h2 id="languages-heading" className="text-xl font-semibold tracking-tight text-white">
            Languages
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Languages you speak and your proficiency level.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[#00fad0] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00fad0]/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Language
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/40">Loading languages…</p>
      ) : languages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Languages className="h-10 w-10 text-white/20" />
          <p className="mt-2 text-sm font-medium text-white/60">No languages added yet</p>
          <p className="text-xs text-white/40">
            Add your spoken languages for global job opportunities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {languages.map((lang) => (
            <div
              key={lang.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00fad0]/10 text-[#00fad0]">
                  <Languages className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{lang.language}</h3>
                  <span className="inline-block mt-0.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
                    {lang.proficiency}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(lang)}
                  className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  title="Edit Language"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(lang.id)}
                  className="rounded-lg p-1.5 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? 'Edit Language' : 'Add Language'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              {formError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/70">
                  Language <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English, German, Spanish"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#00fad0] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70">Proficiency</label>
                <select
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-[#00fad0] focus:outline-none"
                >
                  {PROFICIENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#00fad0] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00fad0]/80 disabled:opacity-50"
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
