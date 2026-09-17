'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Pencil, UserRound } from 'lucide-react';
import { isSmartApiError, queryKeys } from '@smart/api-client';
import { useQueryClient } from '@smart/ui';
import { api } from '@/lib/api';
import {
  profileHeadingClass,
  profilePrimaryButtonClass,
  profileSecondaryButtonSmClass,
  profileSecondaryTextClass,
} from '@/lib/profile-ui-classes';
import { useOnboarding } from '@/lib/use-onboarding';

const MAX_ABOUT_LENGTH = 4000;

export interface AboutSectionProps {
  presentation?: 'default' | 'summary';
  /** Increment to open the editor from a parent control (e.g. Edit Profile). */
  editRequestId?: number;
}

export function AboutSection({ presentation = 'default', editRequestId = 0 }: AboutSectionProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error: queryError } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedAbout, setSavedAbout] = useState('');
  const [draftAbout, setDraftAbout] = useState('');
  const lastEditRequestRef = useRef(0);

  useEffect(() => {
    if (!data) return;
    const about = data.profile?.about ?? data.draft?.about ?? '';
    setSavedAbout(about);
    setDraftAbout(about);
  }, [data]);

  useEffect(() => {
    if (isError) {
      setError(
        isSmartApiError(queryError) ? queryError.message : 'Could not load your About section.',
      );
    }
  }, [isError, queryError]);

  const startEditing = () => {
    setDraftAbout(savedAbout);
    setEditing(true);
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    if (editRequestId <= 0 || editRequestId === lastEditRequestRef.current) return;
    lastEditRequestRef.current = editRequestId;
    setDraftAbout(savedAbout);
    setEditing(true);
    setError(null);
    setSuccess(null);
  }, [editRequestId, savedAbout]);

  const isSummary = presentation === 'summary';
  const heading = isSummary ? 'Professional Summary' : 'About';
  const subheading = isSummary
    ? "Share a short summary about yourself, your skills, and what you're looking for."
    : 'Share a short professional summary employers can read at a glance.';
  const HeadingIcon = isSummary ? FileText : UserRound;
  const emptyCopy = isSummary
    ? 'No About text yet. Add a short summary to help employers understand your background.'
    : 'No About text yet. Add a short summary to help employers understand your background.';
  const hasSavedSummary = Boolean(savedAbout.trim());
  const showSubheading = isSummary ? !hasSavedSummary && !editing : true;

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.myOnboarding() });
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not save your About section.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading About…</p>;
  }

  return (
    <section aria-labelledby="about-heading" className={isSummary ? 'space-y-4' : 'space-y-5'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="about-heading"
            className={`flex items-center gap-2 text-lg font-semibold ${profileHeadingClass}`}
          >
            <HeadingIcon className="h-5 w-5 text-[var(--ds-green)]" />
            {heading}
          </h2>
          {showSubheading ? (
            <p className={`text-sm ${profileSecondaryTextClass} ${isSummary ? 'mt-1' : 'mt-1.5'}`}>
              {subheading}
            </p>
          ) : null}
        </div>
        {!editing ? (
          <button type="button" onClick={startEditing} className={profileSecondaryButtonSmClass}>
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
        <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
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
            className="w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-3 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:border-[var(--ds-green)] focus:outline-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {draftAbout.length}/{MAX_ABOUT_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className={profileSecondaryButtonSmClass}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className={profilePrimaryButtonClass}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : savedAbout.trim() ? (
        <p className={`whitespace-pre-wrap text-[15px] leading-relaxed ${profileHeadingClass}`}>
          {savedAbout}
        </p>
      ) : (
        <div
          className={`rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-sm ${profileSecondaryTextClass} ${
            isSummary ? 'px-5 py-6' : 'p-6'
          }`}
        >
          {emptyCopy}
        </div>
      )}
    </section>
  );
}
