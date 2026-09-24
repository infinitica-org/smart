'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  validateWorkExperienceEffectiveUpdate,
  validateWorkExperienceLetterRules,
  validateWorkExperienceSubmission,
  type CreateWorkExperienceDto,
  type WorkExperienceDto,
  type WorkExperienceDocumentDto,
  type WorkExperienceProofValidationResult,
} from '@smart/contracts';
import { isSmartApiError, queryKeys } from '@smart/api-client';
import { useQuery, useQueryClient } from '@smart/ui';
import { api } from '@/lib/api';
import { profilePrimaryButtonSmClass } from '@/lib/profile-ui-classes';
import { validateVerifierEmailForEmployerSend } from '@/lib/work-experience-verification-ui';
import { ExperienceBuilderModal } from '@/components/profile/work-experience/ExperienceBuilderModal';
import { ExperienceEmptyState } from '@/components/profile/work-experience/ExperienceEmptyState';
import { WorkExperienceExperienceCard } from '@/components/profile/work-experience/WorkExperienceExperienceCard';
import {
  ProfileSectionError,
  ProfileSectionHeader,
} from '@/components/profile/ProfileSectionChrome';
import { profileSectionMeta } from '@/lib/profile-sections';
import { usePerActionCooldown } from '@/lib/use-per-action-cooldown';
import { WORK_EXPERIENCE_RESEND_COOLDOWN_MS } from '@/lib/work-experience-verification-ui';
import {
  applyWorkExperienceSaveValidation,
  normalizeOptionalHttpUrl,
  shouldSkipWorkExperienceDocumentRules,
} from '@/lib/work-experience-save-validation';

function workExperienceSaveErrorMessage(err: unknown, fallback: string): string {
  if (isSmartApiError(err)) {
    if (err.requiresLogin) {
      return 'Your session has expired. Sign in again to save and send verification.';
    }
    const fromFieldErrors = Object.values(err.fieldErrors)[0];
    if (fromFieldErrors) return fromFieldErrors;
    const detailMessage = err.details.find((d) => d.message)?.message;
    if (detailMessage) return detailMessage;
    if (err.message && !err.message.startsWith('Request failed with status')) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

import { nativeOptionClass, nativeSelectClass } from '@/lib/native-select';

const PROOF_FILE_MAX_BYTES = 5 * 1024 * 1024;
const PROOF_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

type ModalPendingDocument = {
  localId: string;
  documentType: WorkExperienceDocumentDto['documentType'];
  file: File;
};

function validateProofFile(file: File): string | null {
  if (!PROOF_FILE_TYPES.includes(file.type)) {
    return 'Only PDF, JPG, and PNG proof documents are accepted.';
  }
  if (file.size > PROOF_FILE_MAX_BYTES) {
    return 'The proof document must be 5MB or smaller.';
  }
  return null;
}

export function WorkExperienceSection() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const highlightExperienceId = searchParams.get('experience');
  const openedHighlightRef = useRef<string | null>(null);

  const {
    data: experiences = [],
    isLoading: loading,
    refetch: refetchExperiences,
  } = useQuery({
    queryKey: queryKeys.myWorkExperiences(),
    queryFn: () => api.users.listWorkExperiences(),
    staleTime: 60_000,
  });
  const [error, setError] = useState<string | null>(null);
  const [proofValidationError, setProofValidationError] = useState<string | null>(null);

  const [focusVerificationOnOpen, setFocusVerificationOnOpen] = useState(false);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Verification state
  const [sendingVerificationId, setSendingVerificationId] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [sendingEndorsementId, setSendingEndorsementId] = useState<string | null>(null);
  const [endorsementSuccess, setEndorsementSuccess] = useState<string | null>(null);
  const {
    startCooldown: startVerificationResendCooldown,
    remainingMs: verificationResendRemainingMs,
    isCoolingDown: isVerificationResendCoolingDown,
  } = usePerActionCooldown(WORK_EXPERIENCE_RESEND_COOLDOWN_MS);

  // Manager Endorsement state
  const [_resendingManagerId, setResendingManagerId] = useState<string | null>(null);
  const {
    startCooldown: startManagerResendCooldown,
    remainingMs: _managerResendRemainingMs,
    isCoolingDown: isManagerResendCoolingDown,
  } = usePerActionCooldown(WORK_EXPERIENCE_RESEND_COOLDOWN_MS);

  const _handleResendManagerEndorsement = async (experienceId: string) => {
    if (isManagerResendCoolingDown(experienceId)) return;
    setResendingManagerId(experienceId);
    setError(null);
    setVerificationSuccess(null);
    try {
      const res = await api.users.resendWorkExperienceManagerEndorsement(experienceId);
      startManagerResendCooldown(experienceId);
      setVerificationSuccess(
        res.message || 'Manager endorsement reminder email queued for delivery.',
      );
      await fetchExperiences();
    } catch (err: unknown) {
      if (isSmartApiError(err) && err.statusCode === 429 && err.retryAfterSeconds) {
        startManagerResendCooldown(experienceId, err.retryAfterSeconds * 1000);
      }
      setError(
        workExperienceSaveErrorMessage(err, 'Failed to resend manager endorsement reminder.'),
      );
    } finally {
      setResendingManagerId(null);
    }
  };

  // Form Fields
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyLinkedinUrl, setCompanyLinkedinUrl] = useState('');
  const [role, setRole] = useState('');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [department, setDepartment] = useState('');
  const [domain, setDomain] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [responsibilities, setResponsibilities] = useState('');
  const [skillQuery, setSkillQuery] = useState('');
  const [selectedSkillCodes, setSelectedSkillCodes] = useState<string[]>([]);
  const [verifierName, setVerifierName] = useState('');
  const [verifierEmail, setVerifierEmail] = useState('');
  const [verifierDesignation, setVerifierDesignation] = useState('');

  // Document Upload Modal state
  const [docModalExpId, setDocModalExpId] = useState<string | null>(null);
  const [docType, setDocType] = useState('EXPERIENCE_LETTER');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Inline proof uploads inside the add/edit experience modal
  const [modalPendingDocs, setModalPendingDocs] = useState<ModalPendingDocument[]>([]);
  const [modalNewDocType, setModalNewDocType] =
    useState<WorkExperienceDocumentDto['documentType']>('OFFER_LETTER');
  const [modalNewProofFile, setModalNewProofFile] = useState<File | null>(null);

  const fetchExperiences = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.myWorkExperiences() });
    await refetchExperiences();
  };

  const openAddModal = () => {
    setEditingId(null);
    setCompanyName('');
    setCompanyWebsite('');
    setCompanyLinkedinUrl('');
    setRole('');
    setEmploymentType('FULL_TIME');
    setDepartment('');
    setDomain('');
    setWorkLocation('');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    setResponsibilities('');
    setSkillQuery('');
    setSelectedSkillCodes([]);
    setVerifierName('');
    setVerifierEmail('');
    setVerifierDesignation('');
    setModalPendingDocs([]);
    setModalNewDocType('OFFER_LETTER');
    setModalNewProofFile(null);
    setFocusVerificationOnOpen(false);
    setError(null);
    setProofValidationError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: WorkExperienceDto, options?: { focusVerification?: boolean }) => {
    setEditingId(exp.id);
    setCompanyName(exp.companyName);
    setCompanyWebsite(exp.companyWebsite || '');
    setCompanyLinkedinUrl(exp.companyLinkedinUrl || '');
    setRole(exp.role);
    setEmploymentType(exp.employmentType);
    setDepartment(exp.department || '');
    setDomain(exp.domain || '');
    setWorkLocation(exp.workLocation || '');
    setStartDate(exp.startDate ? exp.startDate.substring(0, 10) : '');
    setEndDate(exp.endDate ? exp.endDate.substring(0, 10) : '');
    setIsCurrent(exp.isCurrent);
    setResponsibilities(exp.responsibilities || '');
    setSkillQuery('');
    setSelectedSkillCodes(exp.skillsClaimed ?? []);
    setVerifierName(exp.verifierName || '');
    setVerifierEmail(exp.verifierEmail || '');
    setVerifierDesignation(exp.verifierDesignation || '');
    setModalPendingDocs([]);
    setModalNewDocType('OFFER_LETTER');
    setModalNewProofFile(null);
    setFocusVerificationOnOpen(options?.focusVerification ?? false);
    setError(null);
    setProofValidationError(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!highlightExperienceId || loading || experiences.length === 0) return;
    if (openedHighlightRef.current === highlightExperienceId) return;
    const match = experiences.find((exp) => exp.id === highlightExperienceId);
    if (!match) return;
    openedHighlightRef.current = highlightExperienceId;
    openEditModal(match);
  }, [highlightExperienceId, loading, experiences]);

  const tryDispatchEmployerVerification = async (experienceId: string, exp: WorkExperienceDto) => {
    const ruleCheck = validateWorkExperienceLetterRules({
      isCurrent: exp.isCurrent,
      endDate: exp.endDate,
      documents: exp.documents ?? [],
    });
    if (!ruleCheck.valid) {
      setError(ruleCheck.message || 'Upload required proof documents before sending verification.');
      return;
    }
    if (!exp.verifierEmail?.trim()) {
      setError('Add a verifier email in the form, save, then send the link.');
      return;
    }
    const verifierCheck = validateVerifierEmailForEmployerSend({
      verifierEmail: exp.verifierEmail,
      companyWebsite: exp.companyWebsite,
    });
    if (!verifierCheck.valid) {
      setError(verifierCheck.message || 'Verifier email cannot be used for employer verification.');
      return;
    }
    await handleSendVerification(experienceId, exp.status);
  };

  const addModalPendingDocument = () => {
    if (!modalNewProofFile) {
      setError('Select a proof document file to add.');
      return;
    }
    const fileError = validateProofFile(modalNewProofFile);
    if (fileError) {
      setError(fileError);
      return;
    }
    setModalPendingDocs((current) => [
      ...current,
      {
        localId: `${Date.now()}-${Math.random()}`,
        documentType: modalNewDocType,
        file: modalNewProofFile,
      },
    ]);
    setModalNewProofFile(null);
    setError(null);
  };

  const handleSendVerification = async (experienceId: string, status?: string) => {
    const isResendWhilePending = status === 'PENDING_EMPLOYER';
    if (isResendWhilePending && isVerificationResendCoolingDown(experienceId)) {
      return;
    }
    try {
      setSendingVerificationId(experienceId);
      setError(null);
      setVerificationSuccess(null);
      const res =
        status === 'EXPIRED'
          ? await api.users.restartWorkExperienceVerification(experienceId)
          : await api.users.sendWorkExperienceVerification(experienceId);
      setVerificationSuccess(res.message);
      if (isResendWhilePending) {
        startVerificationResendCooldown(experienceId);
      }
      await fetchExperiences();
    } catch (err: unknown) {
      if (isSmartApiError(err) && err.statusCode === 429 && err.retryAfterSeconds) {
        startVerificationResendCooldown(experienceId, err.retryAfterSeconds * 1000);
      }
      setError(workExperienceSaveErrorMessage(err, 'Failed to send verification request.'));
    } finally {
      setSendingVerificationId(null);
    }
  };

  const handleRequestEndorsement = async (
    experienceId: string,
    body: { managerEmail: string; managerName: string },
  ) => {
    if (!isValidEmailFormat(body.managerEmail)) {
      setError('Enter a valid endorser work email before requesting endorsement.');
      return;
    }
    if (body.managerName.trim().length < 2) {
      setError("Enter the endorser's name (at least 2 characters).");
      return;
    }
    try {
      setSendingEndorsementId(experienceId);
      setError(null);
      setEndorsementSuccess(null);
      const res = await api.users.sendWorkExperienceManagerEndorsement(experienceId, body);
      setEndorsementSuccess(res.message);
      await fetchExperiences();
    } catch (err: unknown) {
      setError(workExperienceSaveErrorMessage(err, 'Failed to request manager endorsement.'));
    } finally {
      setSendingEndorsementId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const existingDocs = editingId
        ? (experiences.find((exp) => exp.id === editingId)?.documents ?? [])
        : [];
      const editingExp = editingId ? experiences.find((exp) => exp.id === editingId) : undefined;
      const documentsForValidation = [
        ...existingDocs.map((doc) => ({ documentType: doc.documentType })),
        ...modalPendingDocs.map((doc) => ({ documentType: doc.documentType })),
      ];

      const normalizedCompanyWebsite = normalizeOptionalHttpUrl(companyWebsite);
      const normalizedCompanyLinkedinUrl = normalizeOptionalHttpUrl(companyLinkedinUrl);

      const submissionInput = {
        companyName,
        role,
        employmentType,
        startDate: startDate ? new Date(startDate).toISOString() : '',
        endDate: !isCurrent && endDate ? new Date(endDate).toISOString() : null,
        isCurrent,
        domain,
        responsibilities,
        skillsClaimed: selectedSkillCodes,
        companyId: editingExp?.companyId ?? null,
        companyWebsite: normalizedCompanyWebsite,
        companyLinkedinUrl: normalizedCompanyLinkedinUrl,
        documents: documentsForValidation,
      };

      const validationPatch: Partial<typeof submissionInput> = {
        companyName,
        role,
        employmentType,
        startDate: submissionInput.startDate,
        endDate: submissionInput.endDate,
        isCurrent,
        domain,
        responsibilities,
        skillsClaimed: selectedSkillCodes,
        companyWebsite: submissionInput.companyWebsite,
        companyLinkedinUrl: submissionInput.companyLinkedinUrl,
      };
      if (modalPendingDocs.length > 0) {
        validationPatch.documents = documentsForValidation;
      }

      const validation =
        editingId && editingExp
          ? validateWorkExperienceEffectiveUpdate(
              {
                companyName: editingExp.companyName,
                role: editingExp.role,
                employmentType: editingExp.employmentType,
                startDate: editingExp.startDate,
                endDate: editingExp.endDate,
                isCurrent: editingExp.isCurrent,
                domain: editingExp.domain,
                responsibilities: editingExp.responsibilities,
                skillsClaimed: editingExp.skillsClaimed ?? [],
                companyId: editingExp.companyId,
                companyWebsite: editingExp.companyWebsite,
                companyLinkedinUrl: editingExp.companyLinkedinUrl,
                documents: (editingExp.documents ?? []).map((doc) => ({
                  documentType: doc.documentType,
                })),
              },
              validationPatch,
            )
          : validateWorkExperienceSubmission(submissionInput);

      const skipDocumentRules = shouldSkipWorkExperienceDocumentRules({
        existingDocumentCount: existingDocs.length,
        pendingUploadCount: modalPendingDocs.length,
      });
      const saveValidation = applyWorkExperienceSaveValidation(validation, { skipDocumentRules });

      if (!saveValidation.valid) {
        setError(saveValidation.issues[0]?.message || 'Please complete all required fields.');
        setSubmitting(false);
        return;
      }

      const trimmedVerifierEmail = verifierEmail.trim();
      const trimmedVerifierName = verifierName.trim();
      const trimmedVerifierDesignation = verifierDesignation.trim();

      if (trimmedVerifierEmail && !isValidEmailFormat(trimmedVerifierEmail)) {
        setError('Invalid verifier email format. Use your manager or HR official work email.');
        setSubmitting(false);
        return;
      }

      if (trimmedVerifierEmail) {
        const verifierPrecheck = validateVerifierEmailForEmployerSend({
          verifierEmail: trimmedVerifierEmail,
          companyWebsite: companyWebsite.trim() || null,
        });
        if (!verifierPrecheck.valid) {
          setError(
            verifierPrecheck.message || 'Verifier email cannot be used for employer verification.',
          );
          setSubmitting(false);
          return;
        }
      }

      const payload: Omit<CreateWorkExperienceDto, 'documents'> = {
        companyName,
        companyWebsite: normalizeOptionalHttpUrl(companyWebsite),
        companyLinkedinUrl: normalizeOptionalHttpUrl(companyLinkedinUrl),
        role,
        employmentType: employmentType as WorkExperienceDto['employmentType'],
        department: department.trim() || null,
        domain: domain || null,
        workLocation: workLocation.trim() || null,
        startDate: new Date(startDate).toISOString(),
        endDate: !isCurrent && endDate ? new Date(endDate).toISOString() : null,
        isCurrent,
        responsibilities: responsibilities || null,
        skillsClaimed: selectedSkillCodes,
        verifierName: trimmedVerifierName || null,
        verifierEmail: trimmedVerifierEmail || null,
        verifierDesignation: trimmedVerifierDesignation || null,
      };

      let savedExperienceId = editingId ?? null;

      if (editingId) {
        for (const doc of modalPendingDocs) {
          await api.users.uploadWorkExperienceProofDocument(
            editingId,
            doc.file,
            doc.file.name,
            doc.documentType,
          );
        }
        await api.users.updateWorkExperience(editingId, payload);
      } else {
        const created = await api.users.createWorkExperience(payload as CreateWorkExperienceDto);
        savedExperienceId = created.id;
        try {
          for (const doc of modalPendingDocs) {
            await api.users.uploadWorkExperienceProofDocument(
              created.id,
              doc.file,
              doc.file.name,
              doc.documentType,
            );
          }
        } catch (uploadErr) {
          try {
            await api.users.deleteWorkExperience(created.id);
          } catch {
            // Best-effort rollback; surface the upload failure to the user.
          }
          throw uploadErr;
        }
      }

      setModalPendingDocs([]);
      setModalNewProofFile(null);
      setIsModalOpen(false);
      await fetchExperiences();

      if (trimmedVerifierEmail && savedExperienceId) {
        try {
          const verificationRes = await api.users.sendWorkExperienceVerification(savedExperienceId);
          setVerificationSuccess(verificationRes.message);
          setError(null);
          await fetchExperiences();
        } catch (sendErr: unknown) {
          setError(
            workExperienceSaveErrorMessage(
              sendErr,
              'Experience saved, but the verification email could not be sent. Use "Send Verification Link" to retry.',
            ),
          );
        }
      }
    } catch (err: unknown) {
      setError(workExperienceSaveErrorMessage(err, 'Failed to save work experience entry.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work experience entry?')) return;
    try {
      await api.users.deleteWorkExperience(id);
      await fetchExperiences();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to delete work experience entry.');
    }
  };

  const handleAttachDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docModalExpId || !proofFile) return;

    const fileError = validateProofFile(proofFile);
    if (fileError) {
      setError(fileError);
      return;
    }

    try {
      setUploadingDoc(true);
      setError(null);
      await api.users.uploadWorkExperienceProofDocument(
        docModalExpId,
        proofFile,
        proofFile.name,
        docType as WorkExperienceDocumentDto['documentType'],
      );
      setDocModalExpId(null);
      setProofFile(null);
      await fetchExperiences();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to upload proof document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDocument = async (expId: string, docId: string) => {
    if (!confirm('Remove this proof document attachment?')) return;
    try {
      await api.users.removeWorkExperienceDocument(expId, docId);
      await fetchExperiences();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to remove document.');
    }
  };

  // Document validation state
  const [validatingDocId, setValidatingDocId] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<
    Record<
      string,
      {
        validationStatus: string;
        rejectionReason?: string | null;
        reasonCode?: string | null;
      }
    >
  >({});

  const handleValidateProof = async (expId: string, docId: string) => {
    try {
      setValidatingDocId(docId);
      setProofValidationError(null);
      const result = await api.users.validateWorkExperienceProof(expId, docId);
      const validationResult = result.validationResult as WorkExperienceProofValidationResult;
      setValidationResults((prev) => ({
        ...prev,
        [docId]: {
          validationStatus: validationResult.validationStatus,
          rejectionReason: validationResult.rejectionReason,
          reasonCode: validationResult.reasonCode,
        },
      }));
      await fetchExperiences();
    } catch (err: unknown) {
      setProofValidationError(
        workExperienceSaveErrorMessage(err, 'Proof document validation failed.'),
      );
    } finally {
      setValidatingDocId(null);
    }
  };
  const meta = profileSectionMeta('experience');

  return (
    <section
      className="flex flex-col gap-4 font-[family-name:var(--tpo-font-sans)]"
      aria-label="Work experience"
    >
      <ProfileSectionHeader
        title={meta.title}
        description={meta.description}
        action={
          !loading && experiences.length > 0 ? (
            <button
              type="button"
              onClick={openAddModal}
              className={`${profilePrimaryButtonSmClass} justify-center px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em]`}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              Add experience
            </button>
          ) : null
        }
      />

      {verificationSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-hover)] p-3 text-sm text-[var(--ds-text)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--ds-green)]" />
            <span>{verificationSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setVerificationSuccess(null)}
            className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {endorsementSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-hover)] p-3 text-sm text-[var(--ds-text)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--ds-green)]" />
            <span>{endorsementSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setEndorsementSuccess(null)}
            className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
            aria-label="Dismiss endorsement success message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error ? (
        <ProfileSectionError>
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </span>
        </ProfileSectionError>
      ) : null}

      {proofValidationError ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Proof validation could not complete</p>
            <p className="mt-1 text-xs leading-relaxed">{proofValidationError}</p>
          </div>
          <button
            type="button"
            onClick={() => setProofValidationError(null)}
            className="ml-auto shrink-0 text-amber-900/80 hover:text-amber-950"
            aria-label="Dismiss proof validation error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--ds-text-muted)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--ds-green)]" />
          <span className="ml-2 text-sm">Loading work experience entries...</span>
        </div>
      ) : experiences.length === 0 ? (
        <ExperienceEmptyState onAdd={openAddModal} />
      ) : (
        <div className="flex w-full max-w-none flex-col gap-4">
          {experiences.map((exp, index) => (
            <WorkExperienceExperienceCard
              key={exp.id}
              exp={exp}
              accentIndex={index}
              validationResults={validationResults}
              validatingDocId={validatingDocId}
              sendingVerificationId={sendingVerificationId}
              verificationResendRemainingMs={verificationResendRemainingMs(exp.id)}
              sendingEndorsementId={sendingEndorsementId}
              resendingManagerId={resendingManagerId}
              managerResendRemainingMs={managerResendRemainingMs(exp.id)}
              onResendManagerEndorsement={(id) => void handleResendManagerEndorsement(id)}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onSendVerification={(id, experience) =>
                void tryDispatchEmployerVerification(id, experience)
              }
              onRequestEndorsement={(id, body) => void handleRequestEndorsement(id, body)}
              onValidateProof={handleValidateProof}
              onRemoveDocument={handleRemoveDocument}
              onAttachProof={(expId) => {
                setDocModalExpId(expId);
                setDocType('EXPERIENCE_LETTER');
                setProofFile(null);
              }}
            />
          ))}

          <button
            type="button"
            onClick={openAddModal}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)]/30 py-8 text-sm font-medium text-[var(--ds-text-muted)] transition-colors hover:border-[var(--ds-green)]/40 hover:text-[var(--ds-green)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add another work experience
          </button>
        </div>
      )}

      {isModalOpen ? (
        <ExperienceBuilderModal
          editingId={editingId}
          focusVerification={focusVerificationOnOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSave}
          submitting={submitting}
          error={isModalOpen ? error : null}
          experiences={experiences}
          companyName={companyName}
          setCompanyName={setCompanyName}
          role={role}
          setRole={setRole}
          employmentType={employmentType}
          setEmploymentType={setEmploymentType}
          workLocation={workLocation}
          setWorkLocation={setWorkLocation}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          isCurrent={isCurrent}
          setIsCurrent={setIsCurrent}
          companyWebsite={companyWebsite}
          setCompanyWebsite={setCompanyWebsite}
          companyLinkedinUrl={companyLinkedinUrl}
          setCompanyLinkedinUrl={setCompanyLinkedinUrl}
          domain={domain}
          setDomain={setDomain}
          responsibilities={responsibilities}
          setResponsibilities={setResponsibilities}
          skillQuery={skillQuery}
          setSkillQuery={setSkillQuery}
          selectedSkillCodes={selectedSkillCodes}
          setSelectedSkillCodes={setSelectedSkillCodes}
          verifierName={verifierName}
          setVerifierName={setVerifierName}
          verifierEmail={verifierEmail}
          setVerifierEmail={setVerifierEmail}
          verifierDesignation={verifierDesignation}
          setVerifierDesignation={setVerifierDesignation}
          modalPendingDocs={modalPendingDocs}
          setModalPendingDocs={setModalPendingDocs}
          modalNewDocType={modalNewDocType}
          setModalNewDocType={setModalNewDocType}
          modalNewProofFile={modalNewProofFile}
          setModalNewProofFile={setModalNewProofFile}
          onAddPendingDocument={addModalPendingDocument}
        />
      ) : null}

      {/* Document Attach Modal */}
      {docModalExpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">Attach Proof Document</h3>
              <button
                onClick={() => setDocModalExpId(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAttachDocument} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground/80">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className={`${nativeSelectClass} mt-1 h-10 py-2 text-sm`}
                >
                  <option value="EXPERIENCE_LETTER" className={nativeOptionClass}>
                    Experience Letter
                  </option>
                  <option value="OFFER_LETTER" className={nativeOptionClass}>
                    Offer Letter
                  </option>
                  <option value="PAYSLIP" className={nativeOptionClass}>
                    Payslip
                  </option>
                  <option value="RELIEVING_LETTER" className={nativeOptionClass}>
                    Relieving Letter
                  </option>
                  <option value="FORM_16" className={nativeOptionClass}>
                    Form 16
                  </option>
                  <option value="OTHER">Other Proof Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80">
                  Proof Document *
                </label>
                <input
                  type="file"
                  required
                  accept="application/pdf,image/jpeg,image/jpg,image/png"
                  onChange={(event) => {
                    setProofFile(event.target.files?.[0] ?? null);
                  }}
                  className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-foreground/15 file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  PDF, JPG, or PNG up to 5MB. Files are stored securely for AI proof validation.
                </p>
                {proofFile ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Selected: <span className="font-mono text-foreground/80">{proofFile.name}</span>
                  </p>
                ) : null}
              </div>

              <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setDocModalExpId(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className={`${profilePrimaryButtonSmClass} disabled:opacity-50`}
                >
                  {uploadingDoc && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
