'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { describeApiError } from '@smart/api-client';
import {
  COMPANY_SIZE_BANDS,
  COMPANY_SIZE_BAND_LABELS,
  COMPANY_WORK_EMAIL_REQUIRED_MESSAGE,
  isFreeMailDomain,
  type CompanySizeBand,
} from '@smart/contracts';
import { SmartLogo } from '@smart/ui';
import { api } from '../../../lib/api';
import { sanitizePhoneInput } from '../../../lib/phone-input';
import {
  clearCompanyOnboardingSessionToken,
  readCompanyOnboardingSessionToken,
  writeCompanyOnboardingSessionToken,
} from '../../../lib/company-onboarding-session';

const inputClass =
  'w-full h-11 rounded-[11px] border border-[#e5e7eb] bg-white px-3.5 text-sm text-[#111827] placeholder:text-[#9ca3af] transition-[border-color,box-shadow] duration-150 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6b7280]';

type Step = 'start' | 'details' | 'email' | 'documents' | 'submit' | 'done';

function errorMessage(err: unknown, fallback: string): string {
  return describeApiError(err, fallback);
}

export function CompanyRegisterWizard() {
  const [step, setStep] = useState<Step>('start');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState('');

  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [website, setWebsite] = useState('https://');

  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [sector, setSector] = useState('Software');
  const [mode, setMode] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [sizeBand, setSizeBand] = useState<CompanySizeBand>('51-200');
  const [publicEmail, setPublicEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('IN');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [relationship, setRelationship] = useState<
    'HR' | 'FOUNDER' | 'RECRUITER' | 'DIRECTOR' | 'OTHER'
  >('HR');
  const [taxId, setTaxId] = useState('');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<{
    reason: string | null;
    rejectedDocuments: { documentId: string; fileName: string; reviewReason: string | null }[];
  } | null>(null);

  const resumeSession = useCallback(async (token: string) => {
    const session = await api.public.getCompanyOnboardingSession(token);
    setSessionToken(token);
    writeCompanyOnboardingSessionToken(token);
    if (session.representative.fullName) setFullName(session.representative.fullName);
    if (session.representative.workEmail) setWorkEmail(session.representative.workEmail);
    if (session.profile.displayName) setDisplayName(session.profile.displayName);
    if (session.profile.legalName) setLegalName(session.profile.legalName);
    if (session.profile.website) setWebsite(session.profile.website);
    setReviewFeedback(
      session.onboardingStatus === 'RESUBMISSION_ALLOWED'
        ? {
            reason: session.verificationReason ?? null,
            rejectedDocuments: session.documents.filter((doc) => doc.reviewStatus === 'REJECTED'),
          }
        : null,
    );
    if (session.onboardingStatus === 'PENDING_REVIEW' || session.onboardingStatus === 'SUBMITTED') {
      setStep('done');
      return;
    }
    if (
      session.onboardingStatus === 'EMAIL_VERIFIED' ||
      session.onboardingStatus === 'RESUBMISSION_ALLOWED'
    ) {
      setStep('documents');
      return;
    }
    if (session.onboardingStatus === 'EMAIL_VERIFICATION_PENDING') {
      setStep('email');
      return;
    }
    setStep('details');
  }, []);

  useEffect(() => {
    // The "changes needed" email links here with ?session=<token>; it wins over a stored token.
    const url = new URL(window.location.href);
    const fromLink = url.searchParams.get('session');
    if (fromLink) {
      url.searchParams.delete('session');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    const existing = fromLink ?? readCompanyOnboardingSessionToken();
    if (!existing) return;
    resumeSession(existing).catch((err: unknown) => {
      clearCompanyOnboardingSessionToken();
      if (fromLink) {
        setError(errorMessage(err, 'This link has expired. Start a new registration below.'));
      }
    });
  }, [resumeSession]);

  // Only flag a finished address, so the hint doesn't flash while the domain is still being typed.
  const personalEmailError =
    workEmail.includes('@') && workEmail.trim().includes('.') && isFreeMailDomain(workEmail)
      ? COMPANY_WORK_EMAIL_REQUIRED_MESSAGE
      : null;

  async function onStart(event: React.FormEvent) {
    event.preventDefault();
    if (isFreeMailDomain(workEmail)) {
      setError(COMPANY_WORK_EMAIL_REQUIRED_MESSAGE);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.public.startCompanyOnboarding({
        representative: { fullName: fullName.trim(), workEmail: workEmail.trim() },
        website: website.trim().length > 8 ? website.trim() : undefined,
      });
      writeCompanyOnboardingSessionToken(result.sessionToken);
      setSessionToken(result.sessionToken);
      setStep('details');
    } catch (err) {
      setError(errorMessage(err, 'Could not start registration.'));
    } finally {
      setLoading(false);
    }
  }

  async function onSaveDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      await api.public.updateCompanyOnboardingDraft(sessionToken, {
        profile: {
          displayName: displayName.trim(),
          legalName: legalName.trim(),
          website: website.trim(),
          sector: sector.trim(),
          mode,
          sizeBand,
          publicEmail: publicEmail.trim() || workEmail.trim(),
          address: {
            line1: addressLine1.trim(),
            city: city.trim(),
            country: country.trim().toUpperCase(),
          },
        },
        representative: {
          phone: phone.trim(),
          jobTitle: jobTitle.trim(),
          relationship,
        },
        verification: {
          registrationCountry: country.trim().toUpperCase(),
          legalName: legalName.trim(),
          registeredAddress: {
            line1: addressLine1.trim(),
            city: city.trim(),
            country: country.trim().toUpperCase(),
          },
          taxId: taxId.trim() || undefined,
          businessRegistrationNumber: businessRegistrationNumber.trim() || undefined,
        },
      });
      await api.public.sendCompanyOnboardingEmailVerification(sessionToken);
      setStep('email');
    } catch (err) {
      setError(errorMessage(err, 'Could not save company details.'));
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      await api.public.verifyCompanyOnboardingEmail(sessionToken, { code: emailCode.trim() });
      setStep('documents');
    } catch (err) {
      setError(errorMessage(err, 'Verification failed. Check the code in Mailpit (local dev).'));
    } finally {
      setLoading(false);
    }
  }

  async function onResendCode() {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      await api.public.sendCompanyOnboardingEmailVerification(sessionToken);
    } catch (err) {
      setError(errorMessage(err, 'Could not resend code.'));
    } finally {
      setLoading(false);
    }
  }

  async function onUploadAndContinue(event: React.FormEvent) {
    event.preventDefault();
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      if (documentFile) {
        await api.public.uploadCompanyOnboardingDocument(
          sessionToken,
          documentFile,
          'BUSINESS_REGISTRATION',
        );
      }
      setStep('submit');
    } catch (err) {
      setError(errorMessage(err, 'Document upload failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitApplication(event: React.FormEvent) {
    event.preventDefault();
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      await api.public.submitCompanyOnboarding(sessionToken, {
        attestations: { authorizedToRepresent: true, informationAccurate: true },
      });
      clearCompanyOnboardingSessionToken();
      setStep('done');
    } catch (err) {
      setError(errorMessage(err, 'Could not submit application.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <SmartLogo kind="text" tone="on-light" className="h-8 w-auto" title="SMART" />
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-[#111827]">
          Register your company
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Self-serve onboarding for the SMART company portal. After review, you will receive an
          invite to set your password.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-[#f3c8cc] bg-[#fff1f2] px-4 py-3 text-sm text-[#c24141]"
        >
          {error}
        </p>
      ) : null}

      {step === 'start' ? (
        <form onSubmit={onStart} className="mt-8 space-y-4">
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Your full name
            </label>
            <input
              id="fullName"
              required
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="workEmail" className={labelClass}>
              Work email
            </label>
            <input
              id="workEmail"
              type="email"
              required
              className={inputClass}
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
              aria-invalid={personalEmailError ? true : undefined}
              aria-describedby={personalEmailError ? 'workEmail-error' : undefined}
            />
            {personalEmailError ? (
              <p id="workEmail-error" className="mt-1.5 text-xs text-[#c24141]">
                {personalEmailError}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="website" className={labelClass}>
              Company website
            </label>
            <input
              id="website"
              type="url"
              required
              className={inputClass}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <WizardActions loading={loading} primaryLabel="Continue" />
        </form>
      ) : null}

      {step === 'details' ? (
        <form onSubmit={onSaveDetails} className="mt-8 space-y-4">
          <FieldGroup title="Company profile">
            <input
              required
              placeholder="Display name"
              className={inputClass}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <input
              required
              placeholder="Legal name"
              className={inputClass}
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
            <input
              required
              placeholder="Sector"
              className={inputClass}
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className={inputClass}
                value={mode}
                onChange={(e) => setMode(e.target.value as 'PRODUCT' | 'SERVICE')}
              >
                <option value="PRODUCT">Product company</option>
                <option value="SERVICE">Service company</option>
              </select>
              <select
                required
                aria-label="Number of employees"
                className={inputClass}
                value={sizeBand}
                onChange={(e) => setSizeBand(e.target.value as CompanySizeBand)}
              >
                {COMPANY_SIZE_BANDS.map((band) => (
                  <option key={band} value={band}>
                    {COMPANY_SIZE_BAND_LABELS[band]}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="email"
              placeholder="Public contact email"
              className={inputClass}
              value={publicEmail}
              onChange={(e) => setPublicEmail(e.target.value)}
            />
            <input
              required
              placeholder="Address line 1"
              className={inputClass}
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="City"
                className={inputClass}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <input
                required
                placeholder="Country (IN)"
                maxLength={2}
                className={inputClass}
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
              />
            </div>
          </FieldGroup>
          <FieldGroup title="Your role">
            <input
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={16}
              pattern="\+?[0-9]{8,15}"
              title="Digits only, 8 to 15 digits, with an optional leading +"
              placeholder="Phone (digits only, e.g. +919876543210)"
              aria-label="Phone number"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
            />
            <input
              required
              placeholder="Job title"
              className={inputClass}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
            <select
              className={inputClass}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as typeof relationship)}
            >
              <option value="HR">HR</option>
              <option value="FOUNDER">Founder</option>
              <option value="RECRUITER">Recruiter</option>
              <option value="DIRECTOR">Director</option>
              <option value="OTHER">Other</option>
            </select>
          </FieldGroup>
          <FieldGroup title="Verification">
            <input
              placeholder="Tax / GST ID"
              className={inputClass}
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
            <input
              placeholder="Business registration number"
              className={inputClass}
              value={businessRegistrationNumber}
              onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
            />
          </FieldGroup>
          <WizardActions loading={loading} primaryLabel="Save and verify email" />
        </form>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={onVerifyEmail} className="mt-8 space-y-4">
          <p className="text-sm text-[#64748b]">
            We sent a verification code to <strong>{workEmail}</strong>. In local dev, open{' '}
            <a
              href="http://localhost:8025"
              className="text-[#0f9f8f] underline"
              target="_blank"
              rel="noreferrer"
            >
              Mailpit
            </a>
            .
          </p>
          <input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Verification code"
            className={inputClass}
            value={emailCode}
            onChange={(e) => setEmailCode(e.target.value)}
          />
          <WizardActions loading={loading} primaryLabel="Verify email" />
          <button
            type="button"
            disabled={loading}
            onClick={onResendCode}
            className="text-sm text-[#64748b] underline"
          >
            Resend code
          </button>
        </form>
      ) : null}

      {step === 'documents' && reviewFeedback ? (
        <div className="mt-8 space-y-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
          <p className="font-semibold">Changes requested by the SMART review team</p>
          {reviewFeedback.reason ? <p>{reviewFeedback.reason}</p> : null}
          {reviewFeedback.rejectedDocuments.length > 0 ? (
            <>
              <p>Please upload these documents again:</p>
              <ul className="list-disc space-y-1 pl-5">
                {reviewFeedback.rejectedDocuments.map((doc) => (
                  <li key={doc.documentId}>
                    {doc.fileName}
                    {doc.reviewReason ? `: ${doc.reviewReason}` : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {step === 'documents' ? (
        <form onSubmit={onUploadAndContinue} className="mt-8 space-y-4">
          <p className="text-sm text-[#64748b]">
            Upload a business registration document (PDF, JPG, or PNG, max 5MB). You can skip and
            continue.
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className={inputClass}
            onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
          />
          <WizardActions
            loading={loading}
            primaryLabel="Continue"
            secondaryLabel="Skip"
            onSecondary={() => setStep('submit')}
          />
        </form>
      ) : null}

      {step === 'submit' ? (
        <form onSubmit={onSubmitApplication} className="mt-8 space-y-4">
          <p className="text-sm text-[#64748b]">
            By submitting, you confirm you are authorized to represent this company and that the
            information provided is accurate.
          </p>
          <WizardActions loading={loading} primaryLabel="Submit for review" />
        </form>
      ) : null}

      {step === 'done' ? (
        <div className="mt-8 space-y-4 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-6 text-sm text-[#334155]">
          <p className="font-medium text-[#172033]">Application submitted</p>
          <p>
            SMART will review your company details. When approved, you will receive a portal invite
            email to set your password and sign in.
          </p>
          <Link
            href="/company/login"
            className="inline-block text-black font-semibold underline hover:opacity-80"
          >
            Back to sign in
          </Link>
        </div>
      ) : null}

      <p className="mt-10 text-center text-sm text-[#6b7280]">
        Already have an account?{' '}
        <Link
          href="/company/login"
          className="font-semibold text-[#111827] underline hover:text-black"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-[11px] border border-[#e5e7eb] p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function WizardActions({
  loading,
  primaryLabel,
  secondaryLabel,
  onSecondary,
}: {
  loading: boolean;
  primaryLabel: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <button
        type="submit"
        disabled={loading}
        className="rounded-[11px] bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-70"
      >
        {loading ? 'Please wait…' : primaryLabel}
      </button>
      {secondaryLabel && onSecondary ? (
        <button
          type="button"
          disabled={loading}
          onClick={onSecondary}
          className="rounded-[11px] border border-[#e5e7eb] bg-white px-5 py-3 text-sm font-semibold text-[#111827] shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
        >
          {secondaryLabel}
        </button>
      ) : null}
    </div>
  );
}
