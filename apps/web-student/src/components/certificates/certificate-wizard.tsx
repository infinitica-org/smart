'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, Button } from '@smart/ui';
import type { CandidateCertificateDto } from '@smart/contracts';
import { ArrowLeft, RefreshCw, ShieldAlert, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { CertificateGuidelinesBanner } from './certificate-guidelines-banner';
import { CertificateStatusStepper } from './certificate-status-stepper';
import { CertificateDetailsForm, type CertificateDetailsPayload } from './certificate-details-form';
import { CertificateUpload } from './certificate-upload';
import { CertificatePreview } from './certificate-preview';
import { SkillsLearningForm } from './skills-learning-form';
import { EndorsementRequestForm } from './endorsement-request-form';
import { CertificateStatusBadge } from './certificate-status-badge';
import type { CertificateSkillSelection } from './skill-picker';

export function CertificateWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingId = searchParams.get('id');

  const [certificateId, setCertificateId] = useState<string | null>(existingId);
  const [certificate, setCertificate] = useState<CandidateCertificateDto | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(existingId));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savingSkills, setSavingSkills] = useState(false);
  const [savingLearning, setSavingLearning] = useState(false);
  const [requestingEndorsement, setRequestingEndorsement] = useState(false);
  const [endorsementError, setEndorsementError] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  useEffect(() => {
    if (!existingId) return;
    let cancelled = false;
    api.candidateCertificates
      .get(existingId)
      .then((res) => {
        if (cancelled) return;
        setCertificate(res);
        setCertificateId(existingId);
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [existingId]);

  const { data: eventsRes } = useQuery({
    queryKey: ['candidate-certificate-events', certificateId] as const,
    queryFn: () => api.candidateCertificates.listEvents(certificateId as string),
    enabled: Boolean(certificateId) && certificate !== null,
  });

  const handleCreateDetails = async (details: CertificateDetailsPayload) => {
    setCreating(true);
    setCreateError(null);
    try {
      if (certificateId && certificate) {
        // Updating existing certificate details
        const updated = await api.candidateCertificates.updateLearning(certificateId, {
          certificateNumber: details.certificateNumber,
          verificationUrl: details.verificationUrl,
          issueDate: details.issueDate,
          expiryDate: details.expiryDate,
        });
        setCertificate(updated);
        setIsEditingDetails(false);
      } else {
        // Creating new certificate entry
        const created = await api.candidateCertificates.create(details);
        setCertificate(created);
        setCertificateId(created.certificateId);
        router.replace(`/certificates/add?id=${created.certificateId}`);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to save certificate details.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!certificateId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const updated = await api.candidateCertificates.upload(certificateId, file, file.name);
      setCertificate(updated);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload the certificate.');
    } finally {
      setUploading(false);
    }
  };

  const handleSourceUrlSubmit = async (url: string) => {
    if (!certificateId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const updated = await api.candidateCertificates.updateLearning(certificateId, {
        verificationUrl: url,
      });
      setCertificate(updated);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to save verification URL.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSkills = async (skills: CertificateSkillSelection[]) => {
    if (!certificateId) return;
    setSavingSkills(true);
    try {
      const updated = await api.candidateCertificates.replaceSkills(certificateId, { skills });
      setCertificate(updated);
    } finally {
      setSavingSkills(false);
    }
  };

  const handleSaveLearning = async (fields: {
    learningDescription: string;
    tools: string[];
    practicalApplied: boolean;
    practicalDescription?: string;
  }) => {
    if (!certificateId) return;
    setSavingLearning(true);
    try {
      const updated = await api.candidateCertificates.updateLearning(certificateId, fields);
      setCertificate(updated);
    } finally {
      setSavingLearning(false);
    }
  };

  const handleRequestEndorsement = async (details: {
    endorserName: string;
    endorserEmail: string;
    endorserTitle?: string;
  }) => {
    if (!certificateId) return;
    setRequestingEndorsement(true);
    setEndorsementError(null);
    try {
      const updated = await api.candidateCertificates.requestEndorsement(certificateId, details);
      setCertificate(updated);
    } catch (err) {
      setEndorsementError(err instanceof Error ? err.message : 'Failed to request endorsement.');
    } finally {
      setRequestingEndorsement(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="animate-pulse text-sm text-white/40">Loading certificate data…</p>
      </div>
    );
  }

  // Header navigation bar for all wizard states
  const WizardHeader = () => (
    <div className="mb-6 flex items-center justify-between">
      <Link
        href="/certificates"
        className="inline-flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Certificates
      </Link>
      <Link href="/dashboard" className="text-xs font-medium text-[#00fad0] hover:underline">
        Skip to Dashboard &rarr;
      </Link>
    </div>
  );

  // Step 1: Initial Entry Form (No Certificate Created Yet)
  if (!certificate || isEditingDetails) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <WizardHeader />
        <CertificateGuidelinesBanner />
        <CertificateDetailsForm
          initialValues={
            certificate
              ? {
                  title: certificate.title,
                  issuer: certificate.issuer,
                  certificateNumber: certificate.certificateNumber ?? undefined,
                  issueDate: certificate.issueDate ?? undefined,
                  expiryDate: certificate.expiryDate ?? undefined,
                  verificationUrl: certificate.verificationUrl ?? undefined,
                }
              : undefined
          }
          onSubmit={handleCreateDetails}
          isPending={creating}
          error={createError}
          submitLabel={certificate ? 'Update Details & Recheck' : 'Save & Continue'}
        />
      </div>
    );
  }

  const hasFileOrUrl = Boolean(certificate.certificateFileUrl || certificate.verificationUrl);
  const hasSkills = certificate.skills.length > 0;
  const hasLearning = Boolean(certificate.learningDescription);

  // Step 2: Terminal / Voided / Rejected / Verified View
  const isVoided = certificate.status === 'VOIDED' || certificate.sourceStatus === 'voided';
  const isRejected =
    certificate.status === 'REJECTED' || certificate.sourceStatus === 'source_failed';

  if (isVoided || isRejected) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <WizardHeader />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{certificate.title}</h2>
            <p className="text-sm text-white/50">{certificate.issuer}</p>
          </div>
          <CertificateStatusBadge status={certificate.status} />
        </div>

        <CertificateStatusStepper
          status={certificate.status}
          sourceStatus={certificate.sourceStatus}
          hasFileOrUrl={hasFileOrUrl}
          hasSkills={hasSkills}
          hasLearning={hasLearning}
        />

        {isVoided && (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-sm text-danger-foreground">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 shrink-0 text-danger" />
              <div>
                <h4 className="font-semibold text-danger">Certificate Voided</h4>
                <p className="mt-1 text-xs text-white/80 leading-relaxed">
                  This certificate has been voided by a platform administrator due to an integrity
                  policy violation or invalid credentials. Voided entries cannot be re-verified or
                  edited.
                </p>
              </div>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm text-white">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 shrink-0 text-warning" />
              <div className="flex-1">
                <h4 className="font-semibold text-warning">Source Verification Failed</h4>
                <p className="mt-1 text-xs text-white/80 leading-relaxed">
                  Automated or manual check could not confirm this certificate against the issuer
                  database or verification URL. Please double-check your Certificate Number, direct
                  Verification URL, or re-upload a clear PDF document.
                </p>
                <div className="mt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-2 text-xs"
                    onClick={() => setIsEditingDetails(true)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Edit Details &amp; Retry
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verification History Logs */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">
            Verification History &amp; Audit Log
          </h3>
          {(eventsRes?.events.length ?? 0) === 0 ? (
            <p className="text-xs text-white/40">No verification events recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {eventsRes?.events.map((event) => (
                <li key={event.eventId} className="flex items-start gap-3 text-xs">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00fad0]" />
                  <div>
                    <p className="text-white/80 font-mono">{event.message}</p>
                    <p className="text-[11px] text-white/40">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const readyForVerification =
    hasFileOrUrl &&
    hasSkills &&
    hasLearning &&
    certificate.practicalApplied !== null &&
    (!certificate.practicalApplied || Boolean(certificate.practicalDescription));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <WizardHeader />
      <CertificateGuidelinesBanner />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{certificate.title}</h2>
          <p className="text-sm text-white/50">{certificate.issuer}</p>
          {certificate.certificateNumber && (
            <p className="text-xs text-white/40 font-mono mt-0.5">
              Cert #: {certificate.certificateNumber}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="text-xs text-white/60 hover:text-white"
            onClick={() => setIsEditingDetails(true)}
          >
            Edit Details
          </Button>
          <CertificateStatusBadge status={certificate.status} />
        </div>
      </div>

      <CertificateStatusStepper
        status={certificate.status}
        sourceStatus={certificate.sourceStatus}
        hasFileOrUrl={hasFileOrUrl}
        hasSkills={hasSkills}
        hasLearning={hasLearning}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          {certificate.certificateFileUrl ? (
            <CertificatePreview
              fileUrl={certificate.certificateFileUrl}
              fileName={certificate.certificateFileName ?? 'certificate'}
              mimeType={certificate.fileMimeType}
              onReplace={() => setCertificate({ ...certificate, certificateFileUrl: null })}
            />
          ) : (
            <CertificateUpload
              onUpload={handleUpload}
              onSourceUrlSubmit={handleSourceUrlSubmit}
              isUploading={uploading}
              error={uploadError}
              currentFileName={certificate.certificateFileName}
              currentSourceUrl={certificate.verificationUrl}
            />
          )}
        </div>
        <div>
          <SkillsLearningForm
            certificate={certificate}
            onSaveSkills={handleSaveSkills}
            savingSkills={savingSkills}
            onSaveLearning={handleSaveLearning}
            savingLearning={savingLearning}
          />
        </div>
      </div>

      {readyForVerification ? (
        <EndorsementRequestForm
          onSubmit={handleRequestEndorsement}
          isPending={requestingEndorsement}
          error={endorsementError}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/40">
          Add a certificate file or verification URL, at least one skill, and your practical
          learning details to complete submission.
        </div>
      )}
    </div>
  );
}
