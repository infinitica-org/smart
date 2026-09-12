'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil, UserRound } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';

const MAX_ABOUT_LENGTH = 4000;

export function AboutSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedAbout, setSavedAbout] = useState('');
  const [draftAbout, setDraftAbout] = useState('');

  useEffect(() => {
    let cancelled = false;
    void api.users
      .getOnboarding()
      .then((response) => {
        if (cancelled) return;
        const about = response.profile?.about ?? response.draft?.about ?? '';
        setSavedAbout(about);
        setDraftAbout(about);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your About section.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startEditing = () => {
    setDraftAbout(savedAbout);
    setEditing(true);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setDraftAbout(savedAbout);
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const trimmed = draftAbout.trim();
      await api.users.saveOnboarding({ about: trimmed || undefined });
      setSavedAbout(trimmed);
      setDraftAbout(trimmed);
      setEditing(false);
      setSuccess('About section saved.');
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not save your About section.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading About…</p>;
  }

  return (
    <section aria-labelledby="about-heading" className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="about-heading"
            className="flex items-center gap-2 text-xl font-semibold text-foreground"
          >
            <UserRound className="h-5 w-5 text-[#00fad0]" />
            About
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share a short professional summary employers can read at a glance.
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draftAbout}
            onChange={(event) => setDraftAbout(event.target.value.slice(0, MAX_ABOUT_LENGTH))}
            rows={6}
            placeholder="Describe your background, strengths, and what you are looking for next."
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {draftAbout.length}/{MAX_ABOUT_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-xl border border-border px-3 py-2 font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00fad0] px-4 py-2 font-semibold text-black hover:bg-[#00fad0]/80 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : savedAbout.trim() ? (
        <p className="whitespace-pre-wrap rounded-2xl border border-border bg-muted p-5 text-sm leading-relaxed text-foreground/80">
          {savedAbout}
        </p>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
          No About text yet. Add a short summary to help employers understand your background.
        </div>
      )}
    </section>
  );
}
