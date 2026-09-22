'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import { SmartLogo } from '@smart/ui';
import { api } from '../../../lib/api';
import {
  clearCompanyOnboardingSessionToken,
  readCompanyOnboardingSessionToken,
  writeCompanyOnboardingSessionToken,
} from '../../../lib/company-onboarding-session';

const inputClass =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-[15px] text-[#172033] placeholder:text-[#94a3b8] focus:border-[#0f9f8f] focus:outline-none focus:ring-2 focus:ring-[#ecfdf5]';

const labelClass = 'mb-1.5 block text-[13px] font-medium text-[#64748b]';

type Step = 'start' | 'details' | 'email' | 'documents' | 'submit' | 'done';

function errorMessage(err: unknown, fallback: string): string {
  if (isSmartApiError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
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
  const [sizeBand, setSizeBand] = useState('51-200');
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

  const resumeSession = useCallback(async (token: string) => {
    const session = await api.public.getCompanyOnboardingSession(token);
    setSessionToken(token);
    writeCompanyOnboardingSessionToken(token);
    if (session.representative.fullName) setFullName(session.representative.fullName);
    if (session.representative.workEmail) setWorkEmail(session.representative.workEmail);
    if (session.profile.displayName) setDisplayName(session.profile.displayName);
    if (session.profile.legalName) setLegalName(session.profile.legalName);
    if (session.profile.website) setWebsite(session.profile.website);
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
    const existing = readCompanyOnboardingSessionToken();
    if (!existing) return;
    resumeSession(existing).catch(() => {
      clearCompanyOnboardingSessionToken();
    });
  }, [resumeSession]);

  async function onStart(event: React.FormEvent) {
    event.preventDefault();
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
        <SmartLogo kind="mark" tone="on-light" className="size-11" title="SMART" />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-[#172033]">
          Register your company
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">
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
            />
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
              <input
                required
                placeholder="Size band (e.g. 51-200)"
                className={inputClass}
                value={sizeBand}
                onChange={(e) => setSizeBand(e.target.value)}
              />
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
              placeholder="Phone"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
          <Link href="/login" className="inline-block text-[#0f9f8f] font-medium underline">
            Back to sign in
          </Link>
        </div>
      ) : null}

      <p className="mt-10 text-center text-sm text-[#64748b]">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[#172033] underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-[#e2e8f0] p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[#64748b]">
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
        className="rounded-lg bg-[#172033] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f172a] disabled:opacity-70"
      >
        {loading ? 'Please wait…' : primaryLabel}
      </button>
      {secondaryLabel && onSecondary ? (
        <button
          type="button"
          disabled={loading}
          onClick={onSecondary}
          className="rounded-lg border border-[#e2e8f0] px-5 py-3 text-sm font-medium text-[#334155]"
        >
          {secondaryLabel}
        </button>
      ) : null}
    </div>
  );
}
