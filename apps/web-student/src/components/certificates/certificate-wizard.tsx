'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@smart/ui';
import type { CandidateCertificateDto } from '@smart/contracts';
import { api } from '@/lib/api';
import { CertificateDetailsForm } from './certificate-details-form';
import { CertificateUpload } from './certificate-upload';
import { CertificatePreview } from './certificate-preview';
import { SkillsLearningForm } from './skills-learning-form';
import { CertificateAgendaForm } from './certificate-agenda-form';
import { EndorsementRequestForm } from './endorsement-request-form';
import { CertificateStatusBadge } from './certificate-status-badge';
import type { CertificateSkillSelection } from './skill-picker';

const TERMINAL_STATUSES = new Set(['IN_VERIFICATION', 'VERIFIED', 'REJECTED']);

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
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);

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
    enabled:
      Boolean(certificateId) && certificate !== null && TERMINAL_STATUSES.has(certificate.status),
  });

  const handleCreateDetails = async (details: { title: string; issuer: string }) => {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await api.candidateCertificates.create(details);
      setCertificate(created);
      setCertificateId(created.certificateId);
      router.replace(`/certificates/add?id=${created.certificateId}`);
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
    return <p className="text-sm text-white/40">Loading…</p>;
  }

  if (!certificate) {
    return (
      <CertificateDetailsForm
        onSubmit={handleCreateDetails}
        isPending={creating}
        error={createError}
      />
    );
  }

  const handleSubmitAgenda = async (body: {
    trackCode: import('@smart/contracts').TrackCode;
    agendaLines: string[];
    expiryDate?: string;
  }) => {
    if (!certificateId) return;
    setSavingAgenda(true);
    setAgendaError(null);
    try {
      const updated = await api.candidateCertificates.submitAgenda(certificateId, body);
      setCertificate(updated);
    } catch (err) {
      setAgendaError(err instanceof Error ? err.message : 'Could not save agenda.');
    } finally {
      setSavingAgenda(false);
    }
  };

  if (TERMINAL_STATUSES.has(certificate.status)) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">{certificate.title}</h2>
            <p className="text-sm text-white/45">{certificate.issuer}</p>
          </div>
          <CertificateStatusBadge status={certificate.status} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Verification history</h3>
          {(eventsRes?.events.length ?? 0) === 0 ? (
            <p className="text-sm text-white/40">No events yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {eventsRes?.events.map((event) => (
                <li key={event.eventId} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00fad0]" />
                  <div>
                    <p className="text-white/80">{event.message}</p>
                    <p className="text-xs text-white/30">
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
    Boolean(certificate.certificateFileUrl) &&
    certificate.skills.length > 0 &&
    Boolean(certificate.learningDescription) &&
    certificate.practicalApplied !== null &&
    (!certificate.practicalApplied || Boolean(certificate.practicalDescription));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <h2 className="text-lg font-medium text-white">{certificate.title}</h2>
        <p className="text-sm text-white/45">{certificate.issuer}</p>
      </div>

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
              isUploading={uploading}
              error={uploadError}
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

      {readyForVerification && certificate.sourceStatus === 'source_verified' ? (
        <CertificateAgendaForm
          certificateId={certificate.certificateId}
          initialLines={certificate.agendaLines}
          initialTrack={certificate.trackCode ?? null}
          initialExpiry={certificate.expiryDate ?? null}
          onSubmit={handleSubmitAgenda}
          isPending={savingAgenda}
          error={agendaError}
        />
      ) : readyForVerification ? (
        <EndorsementRequestForm
          onSubmit={handleRequestEndorsement}
          isPending={requestingEndorsement}
          error={endorsementError}
        />
      ) : (
        <p className="text-center text-sm text-white/30">
          Add a certificate file, at least one skill, and your learning details to continue to
          verification.
        </p>
      )}
    </div>
  );
}
