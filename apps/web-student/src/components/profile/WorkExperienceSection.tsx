'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Upload,
  Globe,
  ExternalLink,
  MapPin,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  SKILL_DEFINITIONS,
  companyRequiresPublicIdentity,
  validateWorkExperienceEffectiveUpdate,
  validateWorkExperienceLetterRules,
  validateWorkExperienceSubmission,
  type WorkExperienceDto,
  type WorkExperienceDocumentDto,
  type WorkExperienceProofValidationResult,
} from '@smart/contracts';
import { api } from '@/lib/api';

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));
import { nativeOptionClass, nativeSelectClass } from '@/lib/native-select';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  FREELANCE: 'Freelance',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  OFFER_LETTER: 'Offer Letter',
  EXPERIENCE_LETTER: 'Experience Letter',
  PAYSLIP: 'Payslip',
  RELIEVING_LETTER: 'Relieving Letter',
  FORM_16: 'Form 16',
  OTHER: 'Other Proof Document',
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted — Ready for Verification',
  PENDING_EMPLOYER: 'Pending Employer Response',
  VERIFIED: 'Verified & Confirmed',
  REJECTED: 'Verification Disputed / Rejected',
  EXPIRED: 'Verification Link Expired (Action Needed)',
};

function getNextActionGuidance(
  exp: WorkExperienceDto,
  ruleCheck: { valid: boolean; missingDocuments: string[] },
): string {
  if (exp.status === 'VERIFIED') {
    return 'Work experience claim is fully verified and locked on your candidate profile.';
  }
  if (exp.status === 'EXPIRED') {
    return 'Link Expired — Resend or Try Another Verifier. Click "Restart Verification" or update verifier details.';
  }
  if (exp.status === 'REJECTED') {
    return 'Verification was disputed or rejected by employer verifier. Update verifier details or review claim.';
  }
  if (exp.status === 'PENDING_EMPLOYER') {
    return 'Verification request is active. Automated reminder sent at 6h; expires at 48h. You can resend if needed.';
  }
  // SUBMITTED state:
  if (!ruleCheck.valid) {
    return 'Upload required proof documents (Offer Letter / Relieving Letter) to proceed with claim verification.';
  }
  if (!exp.verifierEmail) {
    return 'Click "Add Verifier" to configure employer HR/Manager contact details for verification.';
  }
  return 'Click "Send Verification Link" to dispatch verification request to your employer verifier.';
}

export function WorkExperienceSection() {
  const [experiences, setExperiences] = useState<WorkExperienceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Verification state
  const [sendingVerificationId, setSendingVerificationId] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

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

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.users.listWorkExperiences();
      setExperiences(res);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load work experiences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, []);

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
    setIsModalOpen(true);
  };

  const openEditModal = (exp: WorkExperienceDto) => {
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
    setIsModalOpen(true);
  };

  const handleSendVerification = async (experienceId: string, status?: string) => {
    try {
      setSendingVerificationId(experienceId);
      setError(null);
      setVerificationSuccess(null);
      const res =
        status === 'EXPIRED'
          ? await api.users.restartWorkExperienceVerification(experienceId)
          : await api.users.sendWorkExperienceVerification(experienceId);
      setVerificationSuccess(res.message);
      await fetchExperiences();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send verification request.';
      setError(message);
    } finally {
      setSendingVerificationId(null);
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
        companyWebsite: companyWebsite || null,
        companyLinkedinUrl: companyLinkedinUrl || null,
        documents: existingDocs.map((doc) => ({
          documentType: doc.documentType,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSizeBytes: doc.fileSizeBytes,
          mimeType: doc.mimeType,
        })),
      };

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
                documents: editingExp.documents ?? [],
              },
              {
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
                documents: submissionInput.documents,
              },
            )
          : validateWorkExperienceSubmission(submissionInput);

      if (!validation.valid) {
        setError(validation.issues[0]?.message || 'Please complete all required fields.');
        setSubmitting(false);
        return;
      }

      const payload = {
        companyName,
        companyWebsite: companyWebsite || null,
        companyLinkedinUrl: companyLinkedinUrl || null,
        role,
        employmentType: employmentType as WorkExperienceDto['employmentType'],
        department: department || null,
        domain: domain || null,
        workLocation: workLocation || null,
        startDate: new Date(startDate).toISOString(),
        endDate: !isCurrent && endDate ? new Date(endDate).toISOString() : null,
        isCurrent,
        responsibilities: responsibilities || null,
        skillsClaimed: selectedSkillCodes,
        verifierName: verifierName || null,
        verifierEmail: verifierEmail || null,
        verifierDesignation: verifierDesignation || null,
        documents: submissionInput.documents,
      };

      if (editingId) {
        await api.users.updateWorkExperience(editingId, payload);
      } else {
        await api.users.createWorkExperience(payload);
      }

      setIsModalOpen(false);
      await fetchExperiences();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to save work experience entry.');
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

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(proofFile.type)) {
      setError('Only PDF, JPG, and PNG proof documents are accepted.');
      return;
    }
    if (proofFile.size > 5 * 1024 * 1024) {
      setError('The proof document must be 5MB or smaller.');
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
      setError(null);
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
      setError((err as Error)?.message || 'Proof document validation failed.');
    } finally {
      setValidatingDocId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
            <Briefcase className="h-5 w-5 text-[#00fad0]" />
            Work Experience
          </h3>
          <p className="text-xs text-muted-foreground">
            Add your professional work history and attach supporting proof documents.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#00fad0] px-4 py-2 text-sm font-medium text-black hover:bg-[#00e0ba] transition-colors md:mt-0"
        >
          <Plus className="h-4 w-4" />
          Add Experience
        </button>
      </div>

      {verificationSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-800" />
            <span>{verificationSuccess}</span>
          </div>
          <button
            onClick={() => setVerificationSuccess(null)}
            className="text-emerald-800 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-[#00fad0]" />
          <span className="ml-2 text-sm">Loading work experience entries...</span>
        </div>
      ) : experiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/50 p-8 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground/80">
            No work experience added yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">
            Demonstrate your domain experience by listing your employment history, internships, and
            corporate roles.
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Entry
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-muted/50 p-5 transition-colors hover:border-border"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-foreground">{exp.role}</h4>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground/70">
                      {EMPLOYMENT_TYPE_LABELS[exp.employmentType] || exp.employmentType}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        exp.status === 'VERIFIED'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          : exp.status === 'PENDING_EMPLOYER'
                            ? 'border border-blue-200 bg-blue-50 text-blue-700'
                            : exp.status === 'EXPIRED'
                              ? 'border border-amber-200 bg-amber-50 text-amber-900'
                              : exp.status === 'SUBMITTED'
                                ? 'border border-[#00fad0]/30 bg-[#00fad0]/10 text-[#00fad0]'
                                : exp.status === 'REJECTED'
                                  ? 'border border-red-200 bg-red-50 text-red-700'
                                  : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {VERIFICATION_STATUS_LABELS[exp.status] || exp.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                      <Building2 className="h-3.5 w-3.5 text-[#00fad0]" />
                      {exp.companyName}
                    </span>
                    {exp.workLocation && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {exp.workLocation}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(exp.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      -{' '}
                      {exp.isCurrent
                        ? 'Present'
                        : exp.endDate
                          ? new Date(exp.endDate).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                    </span>
                    {(exp.isCurrent || !exp.endDate) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#00fad0]/30 bg-[#00fad0]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#00fad0]">
                        Active — pending final documentation
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(exp)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Edit Experience"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-700 transition-colors"
                    title="Delete Entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Company links */}
              {(exp.companyWebsite || exp.companyLinkedinUrl) && (
                <div className="flex items-center gap-3 text-xs text-[#00fad0]/80">
                  {exp.companyWebsite && (
                    <a
                      href={exp.companyWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      Website
                    </a>
                  )}
                  {exp.companyLinkedinUrl && (
                    <a
                      href={exp.companyLinkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      LinkedIn Page
                    </a>
                  )}
                </div>
              )}

              {/* Responsibilities */}
              {exp.responsibilities && (
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                  {exp.responsibilities}
                </p>
              )}

              {/* Skills Tags */}
              {exp.skillsClaimed.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {exp.skillsClaimed.map((skillCode) => (
                    <span
                      key={skillCode}
                      className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground/70"
                    >
                      {SKILL_NAME_BY_CODE.get(skillCode) ?? skillCode}
                    </span>
                  ))}
                </div>
              )}

              {/* Student Status & Tracker Section */}
              {(() => {
                const ruleCheck = validateWorkExperienceLetterRules({
                  isCurrent: exp.isCurrent,
                  endDate: exp.endDate,
                  documents: exp.documents ?? [],
                });

                const docs = exp.documents ?? [];
                let docCheckText = 'No Proof Uploaded';
                let docCheckTag = 'Missing';
                let docCheckStyle = 'bg-muted text-muted-foreground';

                const hasValidated = docs.some(
                  (d) =>
                    (validationResults[d.id]?.validationStatus ??
                      (d as unknown as Record<string, unknown>).validationStatus) === 'VALIDATED',
                );
                const hasManualReview = docs.some(
                  (d) =>
                    (validationResults[d.id]?.validationStatus ??
                      (d as unknown as Record<string, unknown>).validationStatus) ===
                    'NEEDS_MANUAL_REVIEW',
                );
                const hasRejected = docs.some(
                  (d) =>
                    (validationResults[d.id]?.validationStatus ??
                      (d as unknown as Record<string, unknown>).validationStatus) === 'REJECTED',
                );

                if (hasValidated) {
                  docCheckText = 'Validated (AI Check)';
                  docCheckTag = 'Complete';
                  docCheckStyle = 'bg-emerald-50 text-emerald-800';
                } else if (hasManualReview) {
                  docCheckText = 'Needs Manual Review';
                  docCheckTag = 'Review Flagged';
                  docCheckStyle = 'bg-amber-50 text-amber-900';
                } else if (hasRejected) {
                  docCheckText = 'Document Rejected';
                  docCheckTag = 'Rejected';
                  docCheckStyle = 'bg-red-50 text-red-700';
                } else if (docs.length > 0) {
                  docCheckText = 'Pending OCR Check';
                  docCheckTag = 'Pending';
                  docCheckStyle = 'bg-blue-50 text-blue-700';
                }

                const managerEndorsementStatus = (exp as unknown as Record<string, unknown>)
                  .managerEndorsement
                  ? String(
                      (
                        (exp as unknown as Record<string, unknown>).managerEndorsement as Record<
                          string,
                          unknown
                        >
                      ).status || 'PENDING',
                    )
                  : null;

                return (
                  <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border bg-muted/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Student Claim Status Tracker
                      </span>
                      <span className="text-xs font-medium text-[#00fad0]">
                        {VERIFICATION_STATUS_LABELS[exp.status] || exp.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 sm:grid-cols-2">
                      {/* Stage 1: Document Proof */}
                      <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted p-2.5 text-xs">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          1. Document Proof
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-semibold text-foreground/90 truncate max-w-[130px]">
                            {ruleCheck.valid ? 'Rules Satisfied' : 'Missing Proof'}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              ruleCheck.valid
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-amber-50 text-amber-900'
                            }`}
                          >
                            {ruleCheck.valid ? 'Complete' : 'Incomplete'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {exp.isCurrent
                            ? 'Offer Letter required'
                            : 'Offer + Relieving Letter required'}
                        </span>
                      </div>

                      {/* Stage 2: Document Check */}
                      <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted p-2.5 text-xs">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          2. Document Check
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-semibold text-foreground/90 truncate max-w-[130px]">
                            {docCheckText}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${docCheckStyle}`}
                          >
                            {docCheckTag}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {docs.length > 0
                            ? `${docs.length} proof file(s) attached`
                            : 'Upload offer/relieving letter'}
                        </span>
                      </div>

                      {/* Stage 3: Employer Verification */}
                      <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted p-2.5 text-xs">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          3. Employer Verification
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-semibold text-foreground/90 truncate max-w-[130px]">
                            {exp.verifierEmail
                              ? exp.verifierName || exp.verifierEmail
                              : 'No Verifier Set'}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              exp.status === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-800'
                                : exp.status === 'EXPIRED'
                                  ? 'bg-amber-50 text-amber-900'
                                  : exp.status === 'PENDING_EMPLOYER'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {exp.status === 'PENDING_EMPLOYER'
                              ? 'Active Link'
                              : exp.status === 'EXPIRED'
                                ? 'Expired'
                                : exp.status === 'VERIFIED'
                                  ? 'Verified'
                                  : 'Pending'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                          {exp.verifierEmail || 'Click Edit to set verifier'}
                        </span>
                      </div>
                    </div>

                    {/* Manager Endorsement stage if present */}
                    {managerEndorsementStatus && (
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted p-2.5 text-xs">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          4. Manager Endorsement Status
                        </span>
                        <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          {managerEndorsementStatus}
                        </span>
                      </div>
                    )}

                    {/* Expired Verification Banner UX */}
                    {exp.status === 'EXPIRED' && (
                      <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                        <div className="flex items-center gap-2 font-semibold text-amber-900">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-900" />
                          <span>Link Expired — Resend or Try Another Verifier</span>
                        </div>
                        <p className="text-[11px] text-amber-900/80 leading-relaxed">
                          Verification link expired after 48h without a response. You can restart
                          verification with the current verifier or update verifier details first to
                          try another contact.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <button
                            onClick={() => handleSendVerification(exp.id, exp.status)}
                            disabled={sendingVerificationId === exp.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                          >
                            {sendingVerificationId === exp.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Restarting...
                              </>
                            ) : (
                              'Restart Verification'
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(exp)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Update Verifier Details
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Next Action Guidance */}
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-[11px] text-foreground/80">
                      <span className="font-semibold text-[#00fad0] shrink-0">Next Action:</span>
                      <span>{getNextActionGuidance(exp, ruleCheck)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Verifier Contact & Verification Action */}
              {exp.verifierEmail ? (
                <div className="mt-1 flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#00fad0]" />
                      <span>
                        Employer Verifier:{' '}
                        <strong className="text-foreground/80">
                          {exp.verifierName || 'HR/Manager'}
                        </strong>{' '}
                        ({exp.verifierEmail})
                      </span>
                    </div>
                    {exp.status !== 'VERIFIED' && (
                      <button
                        onClick={() => handleSendVerification(exp.id, exp.status)}
                        disabled={sendingVerificationId === exp.id}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition-colors shrink-0 ${
                          exp.status === 'EXPIRED'
                            ? 'border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'bg-[#00fad0]/10 border-[#00fad0]/30 text-[#00fad0] hover:bg-[#00fad0]/20'
                        }`}
                      >
                        {sendingVerificationId === exp.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : exp.status === 'EXPIRED' ? (
                          'Restart Verification'
                        ) : exp.status === 'PENDING_EMPLOYER' ? (
                          'Resend Verification Link'
                        ) : (
                          'Send Verification Link'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <span>
                    No verifier email configured. Add verifier details to initiate employer
                    verification.
                  </span>
                  <button
                    onClick={() => openEditModal(exp)}
                    className="rounded border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 transition-colors"
                  >
                    Add Verifier
                  </button>
                </div>
              )}

              {/* Documents Section */}
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Supporting Proof Documents
                  </span>
                  <button
                    onClick={() => {
                      setDocModalExpId(exp.id);
                      setDocType('EXPERIENCE_LETTER');
                      setProofFile(null);
                    }}
                    className="flex items-center gap-1 text-xs text-[#00fad0] hover:underline font-medium"
                  >
                    <Upload className="h-3 w-3" />
                    Attach Proof
                  </button>
                </div>

                {exp.documents && exp.documents.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {exp.documents.map((doc: WorkExperienceDocumentDto) => {
                      const docRecord = doc as unknown as Record<string, unknown>;
                      const validationResultRecord = docRecord.validationResult as
                        Record<string, unknown> | undefined;
                      const valState = validationResults[doc.id] || {
                        validationStatus: docRecord.validationStatus as string | undefined,
                        rejectionReason: validationResultRecord?.rejectionReason as
                          string | undefined,
                        reasonCode: validationResultRecord?.reasonCode as string | undefined,
                      };
                      const isValidating = validatingDocId === doc.id;
                      const isOfferAttachment = doc.documentType === 'OFFER_LETTER';

                      return (
                        <div
                          key={doc.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-muted p-3 text-xs text-foreground/80"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#00fad0] shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}:
                                </span>
                                <span className="text-muted-foreground truncate max-w-[180px]">
                                  {doc.fileName}
                                </span>
                              </div>
                              {valState.validationStatus === 'VALIDATED' && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#00fad0] font-medium mt-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> ✓ Proof Validated
                                </span>
                              )}
                              {valState.validationStatus === 'NEEDS_MANUAL_REVIEW' && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-900 font-medium mt-0.5">
                                  <AlertCircle className="h-3 w-3" /> Manual Review Flagged:{' '}
                                  {valState.rejectionReason || 'Role or date variance detected'}
                                </span>
                              )}
                              {valState.validationStatus === 'REJECTED' && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-red-700 font-medium mt-0.5">
                                  <AlertCircle className="h-3 w-3" /> Proof Rejected:{' '}
                                  {valState.reasonCode === 'INVALID_DOCUMENT_TYPE'
                                    ? valState.rejectionReason ||
                                      'Offer letters support your claim but cannot be validated as employment proof.'
                                    : valState.rejectionReason || 'Document mismatch detected'}
                                </span>
                              )}
                              {isOfferAttachment && !valState.validationStatus && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium mt-0.5">
                                  Offer letters support your claim but cannot be validated as
                                  employment proof.
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {!valState.validationStatus && !isOfferAttachment && (
                              <button
                                onClick={() => handleValidateProof(exp.id, doc.id)}
                                disabled={isValidating}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#00fad0]/30 bg-[#00fad0]/10 px-2.5 py-1 text-[11px] font-medium text-[#00fad0] hover:bg-[#00fad0]/20 disabled:opacity-50 transition-colors"
                              >
                                {isValidating ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" /> Validating...
                                  </>
                                ) : (
                                  'Validate Proof'
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveDocument(exp.id, doc.id)}
                              className="text-muted-foreground/50 hover:text-red-700 p-1"
                              title="Remove document"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    No proof document attached yet.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Experience Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-border bg-card p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Edit Work Experience' : 'Add Work Experience'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Rule Explanation Banner (WE-T01) */}
            <div className="mt-3 rounded-2xl border border-[#00fad0]/25 bg-[#00fad0]/5 p-3.5 text-xs text-foreground/90">
              <div className="flex items-center gap-2 font-semibold text-[#00fad0]">
                <FileText className="h-4 w-4 shrink-0" />
                <span>Document Requirement Rules</span>
              </div>
              <p className="mt-1 text-foreground/75 leading-relaxed">
                {isCurrent ? (
                  <>
                    <strong className="text-[#00fad0]">Ongoing Role: Offer letter required.</strong>{' '}
                    Status will display as{' '}
                    <span className="font-semibold text-foreground">
                      Active — pending final documentation
                    </span>
                    .
                  </>
                ) : (
                  <>
                    <strong className="text-amber-900">
                      Ended Role: Offer Letter + Completion/Relieving Letter required.
                    </strong>{' '}
                    Both an Offer Letter and a Completion/Relieving Letter are required before
                    submission.
                  </>
                )}
              </p>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-900" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Role / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Software Engineer Intern"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Employment Type *
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className={`${nativeSelectClass} mt-1 h-10 py-2 text-sm`}
                  >
                    <option value="FULL_TIME" className={nativeOptionClass}>
                      Full-time
                    </option>
                    <option value="PART_TIME" className={nativeOptionClass}>
                      Part-time
                    </option>
                    <option value="CONTRACT" className={nativeOptionClass}>
                      Contract
                    </option>
                    <option value="INTERNSHIP" className={nativeOptionClass}>
                      Internship
                    </option>
                    <option value="FREELANCE" className={nativeOptionClass}>
                      Freelance
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Work Location
                  </label>
                  <input
                    type="text"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="e.g. Bangalore, India (or Remote)"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Company Website
                    {companyRequiresPublicIdentity({
                      companyId: editingId
                        ? (experiences.find((exp) => exp.id === editingId)?.companyId ?? null)
                        : null,
                      companyWebsite,
                    })
                      ? ' *'
                      : ''}
                  </label>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Company LinkedIn URL
                    {companyRequiresPublicIdentity({
                      companyId: editingId
                        ? (experiences.find((exp) => exp.id === editingId)?.companyId ?? null)
                        : null,
                      companyWebsite,
                    })
                      ? ' *'
                      : ''}
                  </label>
                  <input
                    type="url"
                    value={companyLinkedinUrl}
                    onChange={(e) => setCompanyLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/company/acme"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    End Date{!isCurrent ? ' *' : ''}
                  </label>
                  <input
                    type="date"
                    disabled={isCurrent}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-40 focus:border-[#00fad0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-background text-[#00fad0] focus:ring-0"
                />
                <label htmlFor="isCurrent" className="text-xs text-foreground/80">
                  I currently work in this role
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80">
                  Professional Domain *
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. Software Engineering, Business Analytics"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80">
                  Responsibilities & Accomplishments *
                </label>
                <textarea
                  rows={3}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="Key responsibilities, projects, and technologies used..."
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80">
                  Skills used (from catalog) *
                </label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Pick skills from the v0.9 taxonomy — free-text tags are not accepted.
                </p>
                {selectedSkillCodes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSkillCodes.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() =>
                          setSelectedSkillCodes((current) =>
                            current.filter((item) => item !== code),
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground/80"
                      >
                        {SKILL_NAME_BY_CODE.get(code) ?? code}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                ) : null}
                <input
                  type="text"
                  value={skillQuery}
                  onChange={(e) => setSkillQuery(e.target.value)}
                  placeholder="Search skills…"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                />
                {skillQuery.trim().length >= 2 ? (
                  <ul className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-border bg-card">
                    {SKILL_DEFINITIONS.filter((skill) => {
                      const q = skillQuery.trim().toLowerCase();
                      return (
                        (skill.name.toLowerCase().includes(q) ||
                          skill.code.toLowerCase().includes(q)) &&
                        !selectedSkillCodes.includes(skill.code)
                      );
                    })
                      .slice(0, 6)
                      .map((skill) => (
                        <li key={skill.code}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSkillCodes((current) => [...current, skill.code]);
                              setSkillQuery('');
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-foreground/80 hover:bg-muted"
                          >
                            {skill.name}
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#00fad0]">
                  Employer Verifier Contact (Optional)
                </h4>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Provide HR/Manager contact details for verification dispatch.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] text-foreground/80">Verifier Name</label>
                    <input
                      type="text"
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      placeholder="Jane Manager"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-foreground/80">
                      Official Work Email
                    </label>
                    <input
                      type="email"
                      value={verifierEmail}
                      onChange={(e) => setVerifierEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-foreground/80">Designation</label>
                    <input
                      type="text"
                      value={verifierDesignation}
                      onChange={(e) => setVerifierDesignation(e.target.value)}
                      placeholder="Engineering Lead"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#00fad0] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00fad0] px-5 py-2 text-xs font-medium text-black hover:bg-[#00e0ba] disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Submit Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-[#00fad0]/15 file:px-3 file:py-2 file:text-xs file:font-medium file:text-[#00fad0]"
                />
                <p className="mt-1 text-[11px] text-white/40">
                  PDF, JPG, or PNG up to 5MB. Files are stored securely for AI proof validation.
                </p>
                {proofFile ? (
                  <p className="mt-1 text-[11px] text-white/60">
                    Selected: <span className="font-mono text-white/80">{proofFile.name}</span>
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
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00fad0] px-5 py-2 text-xs font-medium text-black hover:bg-[#00e0ba] disabled:opacity-50"
                >
                  {uploadingDoc && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
