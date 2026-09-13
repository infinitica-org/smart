'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import {
  applyServerDraft,
  emptyOnboardingForm,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';
import { api } from '@/lib/api';
import SocialVerification from '@/components/onboarding/steps/SocialVerification';

export function ProfessionalLinksSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<OnboardingProfileForm>(emptyOnboardingForm());

  useEffect(() => {
    let cancelled = false;
    void api.users
      .getOnboarding()
      .then((response) => {
        if (cancelled) return;
        const next = applyServerDraft(emptyOnboardingForm(), response.profile ?? response.draft);
        setFormData(next);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load saved professional links.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.users.saveOnboarding({
        linkedinUrl: formData.linkedinUrl.trim() || undefined,
        githubUrl: formData.githubUrl.trim() || undefined,
        socialVerification: formData.socialVerification,
      });
      setSuccess('Professional links saved.');
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not save professional links.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading professional links…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-foreground">Professional links</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add LinkedIn or GitHub so employers can learn more about you. Verification is optional.
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

      <SocialVerification formData={formData} updateField={updateField} />

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-[#131313] disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save links'}
      </button>
    </div>
  );
}
