'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { CandidateAcademicScores } from '@smart/contracts';
import { api } from '@/lib/api';

/**
 * CGPA/10th/12th are `User`-level scalars (not `CandidateEducation` rows) so matching can
 * filter a whole batch on them directly — see `academicScores` on the onboarding draft/complete
 * payloads. Saved the same way as job preferences: a `PUT /me/onboarding` patch.
 */
export function AcademicScoresSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cgpa, setCgpa] = useState('');
  const [sscPercentage, setSscPercentage] = useState('');
  const [hscPercentage, setHscPercentage] = useState('');
  const [hasActiveBacklog, setHasActiveBacklog] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.users
      .getOnboarding()
      .then((response) => {
        if (cancelled) return;
        const scores: CandidateAcademicScores | undefined =
          response.profile?.academicScores ?? response.draft?.academicScores;
        if (!scores) return;
        setCgpa(scores.cgpa?.toString() ?? '');
        setSscPercentage(scores.sscPercentage?.toString() ?? '');
        setHscPercentage(scores.hscPercentage?.toString() ?? '');
        setHasActiveBacklog(scores.hasActiveBacklog === true);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load saved academic scores.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const parsed: {
      cgpa?: number;
      sscPercentage?: number;
      hscPercentage?: number;
      hasActiveBacklog?: boolean;
    } = { hasActiveBacklog };
    if (cgpa.trim()) {
      const value = Number(cgpa);
      if (Number.isNaN(value) || value < 0 || value > 10) {
        setError('CGPA must be a number between 0 and 10.');
        return;
      }
      parsed.cgpa = value;
    }
    if (sscPercentage.trim()) {
      const value = Number(sscPercentage);
      if (Number.isNaN(value) || value < 0 || value > 100) {
        setError('10th percentage must be a number between 0 and 100.');
        return;
      }
      parsed.sscPercentage = value;
    }
    if (hscPercentage.trim()) {
      const value = Number(hscPercentage);
      if (Number.isNaN(value) || value < 0 || value > 100) {
        setError('12th percentage must be a number between 0 and 100.');
        return;
      }
      parsed.hscPercentage = value;
    }

    setSaving(true);
    try {
      await api.users.saveOnboarding({ academicScores: parsed });
      setSuccess('Academic scores saved.');
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not save academic scores.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading academic scores…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-foreground">Academic scores</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional, but companies often set CGPA cutoffs — keeping this filled in helps TPOs match
          you to more opportunities.
        </p>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/80">CGPA</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={10}
            step={0.01}
            value={cgpa}
            onChange={(e) => setCgpa(e.target.value)}
            placeholder="e.g. 8.5"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/80">10th (SSC) %</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            value={sscPercentage}
            onChange={(e) => setSscPercentage(e.target.value)}
            placeholder="e.g. 92.4"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/80">12th (HSC) %</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            value={hscPercentage}
            onChange={(e) => setHscPercentage(e.target.value)}
            placeholder="e.g. 88.1"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
          />
        </div>
      </div>

      <label className="flex max-w-2xl items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-border"
          checked={hasActiveBacklog}
          onChange={(e) => setHasActiveBacklog(e.target.checked)}
        />
        <span>I currently have active academic backlogs (standing arrears).</span>
      </label>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save scores'}
      </button>
    </div>
  );
}
