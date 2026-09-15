'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError, queryKeys } from '@smart/api-client';
import { useQueryClient } from '@smart/ui';
import {
  applyServerDraft,
  emptyOnboardingForm,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';
import { api } from '@/lib/api';
import { useOnboarding } from '@/lib/use-onboarding';
import SocialVerification from '@/components/onboarding/steps/SocialVerification';

export function ProfessionalLinksSection() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error: queryError } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<OnboardingProfileForm>(emptyOnboardingForm());

  useEffect(() => {
    if (!data) return;
    const next = applyServerDraft(emptyOnboardingForm(), data.profile ?? data.draft);
    setFormData(next);
  }, [data]);

  useEffect(() => {
    if (isError) {
      setError(
        isSmartApiError(queryError)
          ? queryError.message
          : 'Could not load saved professional links.',
      );
    }
  }, [isError, queryError]);

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.myOnboarding() });
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not save professional links.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
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
        <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
          {success}
        </p>
      ) : null}

      <SocialVerification formData={formData} updateField={updateField} />

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-[#131313] disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save links'}
      </button>
    </div>
  );
}
