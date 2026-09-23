'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type {
  PartnerUniversityOptionDto,
  StudentInstitutionPartnershipStatusDto,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';
import { ErrorBanner, PrimaryButton, StepHeading, TextInput } from '../wizard-ui';

interface ConnectUniversityStepProps {
  onContinue: () => void;
  onConnected?: (institutionId: string) => void;
}

export default function ConnectUniversityStep({
  onContinue,
  onConnected,
}: ConnectUniversityStepProps) {
  const [query, setQuery] = useState('');
  const [universities, setUniversities] = useState<PartnerUniversityOptionDto[]>([]);
  const [partnershipStatus, setPartnershipStatus] =
    useState<StudentInstitutionPartnershipStatusDto | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contactRequestState, setContactRequestState] = useState<
    'idle' | 'confirming' | 'submitting' | 'submitted'
  >('idle');
  const [contactRequestError, setContactRequestError] = useState<string | null>(null);

  const fetchPartnershipStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await api.onboarding.getInstitutionPartnershipStatus();
      setPartnershipStatus(res);
      if (res.institutionId && res.isPartnered) {
        setSelectedId(res.institutionId);
      }
    } catch (err: unknown) {
      if (isSmartApiError(err)) {
        setStatusError(err.message);
      } else {
        setStatusError('Could not verify institution partnership status.');
      }
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPartnershipStatus();
  }, [fetchPartnershipStatus]);

  useEffect(() => {
    let cancelled = false;
    setLoadingUniversities(true);
    setSubmitError(null);
    setContactRequestState('idle');
    setContactRequestError(null);

    api.onboarding
      .listPartnerUniversities({ q: query.trim() || undefined })
      .then((res: PartnerUniversityOptionDto[]) => {
        if (!cancelled) {
          setUniversities(res);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          if (isSmartApiError(err)) {
            setSubmitError(err.message);
          } else {
            setSubmitError('Could not load partner universities.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingUniversities(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleConnect = async () => {
    if (!selectedId) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const updatedUser = await api.onboarding.connectPartnerUniversity({
        institutionId: selectedId,
      });
      const match = universities.find((u) => u.institutionId === selectedId);
      const newName = match?.name ?? updatedUser.institutionName ?? 'Connected University';
      setPartnershipStatus({
        institutionId: selectedId,
        institutionName: newName,
        isPartnered: true,
      });
      if (onConnected) {
        onConnected(selectedId);
      }
    } catch (err: unknown) {
      if (isSmartApiError(err)) {
        if (err.code === 'invalid_partner_university') {
          setSubmitError('The selected university is not an active partner university.');
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('Failed to connect university. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestUniversityContact = async () => {
    const universityName = query.trim();
    if (!universityName || contactRequestState === 'submitting') return;

    setContactRequestState('submitting');
    setContactRequestError(null);

    try {
      await api.onboarding.requestUniversityContact({ universityName });
      setContactRequestState('submitted');
    } catch (err: unknown) {
      if (isSmartApiError(err)) {
        setContactRequestError(err.message);
      } else {
        setContactRequestError('Could not send the request. Please try again.');
      }
      setContactRequestState('confirming');
    }
  };

  const isCurrentPartnered = Boolean(partnershipStatus?.isPartnered);
  const isUnpartnered = Boolean(
    partnershipStatus?.institutionId && !partnershipStatus?.isPartnered,
  );

  return (
    <div data-testid="connect-university-step">
      <StepHeading
        title="Connect to your Partner University"
        subtitle="Link your account to your university to unlock campus placements, batch verification, and institutional credentials."
      />

      <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-900 dark:text-blue-200">
        <p className="font-semibold">📊 Note on Institutional Access</p>
        <p className="mt-0.5 opacity-90">
          Your university must be an active SMART partner and must have whitelisted your student
          email to enable automatic credential verification.
        </p>
      </div>

      <AnimatePresence>
        {statusError ? (
          <div className="mb-4">
            <ErrorBanner>{statusError}</ErrorBanner>
            <button
              type="button"
              data-testid="retry-status-btn"
              onClick={() => void fetchPartnershipStatus()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry status check
            </button>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {submitError ? <ErrorBanner>{submitError}</ErrorBanner> : null}
      </AnimatePresence>

      {statusLoading ? (
        <div
          data-testid="status-loading"
          className="mb-6 flex h-16 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          Checking institution partnership status...
        </div>
      ) : (
        isPartneredBadge(partnershipStatus, isCurrentPartnered, isUnpartnered)
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <TextInput
            data-testid="university-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSubmitError(null);
            }}
            placeholder="Search university by name or domain (e.g. PSG, psgtech.ac.in)..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="mb-8 min-h-[160px] max-h-[280px] overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50/50 p-2 dark:border-zinc-800 dark:bg-zinc-900/50">
        {loadingUniversities ? (
          <div
            className="flex h-32 items-center justify-center text-sm text-zinc-500"
            data-testid="universities-loading"
          >
            Loading partner universities...
          </div>
        ) : universities.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center px-4 py-6 text-center text-sm text-zinc-500"
            data-testid="universities-empty"
          >
            <Building2 className="mb-2 h-6 w-6 text-zinc-400" />
            <p>No matching partner universities found.</p>
            <p className="text-xs text-zinc-400">Try adjusting your search terms.</p>

            {query.trim() ? (
              <div className="mt-4 w-full max-w-sm">
                {contactRequestState === 'submitted' ? (
                  <div
                    data-testid="university-contact-requested"
                    className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-left text-emerald-900 dark:text-emerald-200"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs">
                      Request sent — SMART will follow up with{' '}
                      <span className="font-medium">{query.trim()}</span>. You don&apos;t need to
                      submit another request.
                    </p>
                  </div>
                ) : contactRequestState === 'confirming' || contactRequestState === 'submitting' ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 text-left dark:border-zinc-800 dark:bg-zinc-900">
                    {contactRequestError ? (
                      <p className="mb-2 text-xs text-red-600 dark:text-red-400">
                        {contactRequestError}
                      </p>
                    ) : null}
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      We&apos;ll reach out to <span className="font-medium">{query.trim()}</span> on
                      your behalf.
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <PrimaryButton
                        data-testid="confirm-university-contact-btn"
                        onClick={() => void handleRequestUniversityContact()}
                        loading={contactRequestState === 'submitting'}
                        disabled={contactRequestState === 'submitting'}
                      >
                        Confirm request
                      </PrimaryButton>
                      <button
                        type="button"
                        onClick={() => {
                          setContactRequestState('idle');
                          setContactRequestError(null);
                        }}
                        disabled={contactRequestState === 'submitting'}
                        className="text-xs font-medium text-zinc-500 hover:text-foreground disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="request-university-contact-btn"
                    onClick={() => setContactRequestState('confirming')}
                    className="text-xs font-medium text-foreground underline underline-offset-2 hover:opacity-80"
                  >
                    Ask SMART to contact {query.trim()}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-2">
            {universities.map((uni) => {
              const isSelected = selectedId === uni.institutionId;
              return (
                <button
                  key={uni.institutionId}
                  type="button"
                  data-testid={`university-option-${uni.institutionId}`}
                  onClick={() => {
                    setSelectedId(uni.institutionId);
                    setSubmitError(null);
                  }}
                  className={`flex items-center justify-between rounded-xl p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border border-foreground bg-white shadow-sm dark:bg-zinc-800'
                      : 'border border-transparent hover:bg-white/60 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{uni.name}</p>
                      <p className="text-xs text-zinc-500">{uni.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" />
                      Partner
                    </span>
                    <input
                      type="radio"
                      name="selectedUniversity"
                      checked={isSelected}
                      onChange={() => setSelectedId(uni.institutionId)}
                      className="h-4 w-4 accent-foreground"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onContinue}
          disabled={submitting}
          className="font-axiforma text-sm text-zinc-400 transition-colors hover:text-foreground disabled:opacity-40"
        >
          {isCurrentPartnered ? 'Continue' : "I'll connect later"}
        </button>
        {isCurrentPartnered && selectedId === partnershipStatus?.institutionId ? (
          <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
        ) : (
          <PrimaryButton
            data-testid="connect-university-submit"
            onClick={() => void handleConnect()}
            loading={submitting}
            disabled={!selectedId || submitting}
          >
            Connect University
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

function isPartneredBadge(
  status: StudentInstitutionPartnershipStatusDto | null,
  isPartnered: boolean,
  isUnpartnered: boolean,
) {
  if (isUnpartnered && status?.institutionName) {
    return (
      <div
        data-testid="unpartnered-warning"
        className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Institution Not Yet Partnered</p>
            <p className="mt-1 text-sm opacity-90">
              <span className="font-medium">{status.institutionName}</span> is not currently
              partnered with SMART.
            </p>
            <p className="mt-1 text-xs opacity-80">
              You can connect to an eligible partner university below to unlock campus placements,
              batch verification, and institutional credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isPartnered && status?.institutionName) {
    return (
      <div
        data-testid="partnered-status"
        className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-900 dark:text-emerald-200"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold">Connected Partner Account</p>
            <p className="text-sm opacity-90">{status.institutionName}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Partner Verified
        </span>
      </div>
    );
  }

  return null;
}
