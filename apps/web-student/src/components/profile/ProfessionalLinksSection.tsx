'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError, queryKeys } from '@smart/api-client';
import { useQueryClient } from '@smart/ui';
import { Link2 } from 'lucide-react';
import {
  applyServerDraft,
  buildProfessionalLinksSavePayload,
  emptyOnboardingForm,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';
import { api } from '@/lib/api';
import {
  ProfileSectionError,
  ProfileSectionHeader,
} from '@/components/profile/ProfileSectionChrome';
import { profilePrimaryButtonSmClass } from '@/lib/profile-ui-classes';
import { profileSectionMeta } from '@/lib/profile-sections';
import { useOnboarding } from '@/lib/use-onboarding';
import SocialVerification from '@/components/onboarding/steps/SocialVerification';

export function ProfessionalLinksSection() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error: queryError } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<OnboardingProfileForm>(emptyOnboardingForm());
  const meta = profileSectionMeta('links');

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
      const payload = buildProfessionalLinksSavePayload(formData);
      await api.users.saveOnboarding(payload);
      setFormData((current) => ({
        ...current,
        linkedinUrl: payload.linkedinUrl ?? '',
        githubUrl: payload.githubUrl ?? '',
      }));
      setSuccess('Professional links saved.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.myOnboarding() });
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not save professional links.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-4 font-[family-name:var(--tpo-font-sans)]"
      aria-label="Professional links"
    >
      <ProfileSectionHeader title={meta.title} description={meta.description} />

      {isLoading ? (
        <p className="text-sm text-[var(--ds-text-muted)]">Loading professional links…</p>
      ) : null}

      {!isLoading ? (
        <>
          {error ? <ProfileSectionError>{error}</ProfileSectionError> : null}
          {success ? (
            <div className="rounded-[18px] border border-[var(--ds-green)]/20 bg-[var(--ds-green-soft)]/50 px-4 py-3.5 text-sm text-[var(--ds-text)]">
              {success}
            </div>
          ) : null}

          <div className="w-full overflow-hidden rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="border-b border-[var(--ds-border-subtle)]/80 bg-gradient-to-br from-[#ecfdf5]/70 via-[var(--ds-surface)] to-[var(--ds-surface)] px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-white/80 text-[var(--ds-green)] ring-1 ring-[var(--ds-green)]/15">
                  <Link2 className="size-5" strokeWidth={1.5} aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ds-text)]">
                    Verify when you can
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ds-text-muted)]">
                    URLs are saved to your profile immediately. LinkedIn and GitHub verification are
                    optional but help employers trust what they see.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 md:px-6 md:py-6">
              <SocialVerification formData={formData} updateField={updateField} />

              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--ds-border-subtle)]/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] leading-relaxed text-[var(--ds-text-muted)]">
                  Save after editing URLs or confirming GitHub — verification state is stored with
                  your profile.
                </p>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className={`${profilePrimaryButtonSmClass} w-full justify-center px-5 py-2.5 text-[13px] sm:w-auto disabled:opacity-50`}
                >
                  {saving ? 'Saving…' : 'Save links'}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
