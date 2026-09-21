'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, FileText, Loader2, Plus, Upload } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { CandidateResumeFile } from '@smart/contracts';
import { api } from '@/lib/api';
import { ResumeEntryCard } from '@/components/profile/ResumeEntryCard';
import {
  ProfileBentoEmptyPanel,
  ProfileSectionError,
  ProfileSectionHeader,
} from '@/components/profile/ProfileSectionChrome';
import { profilePrimaryButtonSmClass } from '@/lib/profile-ui-classes';
import { profileSectionMeta } from '@/lib/profile-sections';
import { CANDIDATE_RESUME_FILES_MAX, canAddResume, normalizeResumeFiles } from '@/lib/resume-list';
import { extractResumeRawText } from '@/lib/extract-resume-text';

const MAX_BYTES = 5 * 1024 * 1024;

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'success' | 'failed';

export function ResumeSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [resumeFiles, setResumeFiles] = useState<CandidateResumeFile[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const meta = profileSectionMeta('resume');

  const loadResume = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.users.getResume();
      setResumeFiles(normalizeResumeFiles(response));
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not load resume status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResume();
  }, []);

  const startUpload = async (file: File) => {
    if (!canAddResume(resumeFiles)) {
      setError(
        `You can store up to ${CANDIDATE_RESUME_FILES_MAX} resumes. Remove one to upload another.`,
      );
      return;
    }

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const extOk = /\.(pdf|docx?|txt)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extOk) {
      setError('Use a PDF, DOCX, DOC, or TXT file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File must be 5 MB or smaller.');
      return;
    }

    setError(null);
    setParseMessage(null);
    setUploadStatus('uploading');

    try {
      const uploaded = await api.users.uploadResume(file, file.name);
      const nextFiles = normalizeResumeFiles(uploaded);
      setResumeFiles(nextFiles);
      setUploadStatus('parsing');

      const rawText = await extractResumeRawText(file);
      const parsed = await api.users.parseResume({ rawText });
      if (parsed.status === 'PARSED') {
        setParseMessage(
          'Resume uploaded and parsed — check other profile sections for pre-fill suggestions.',
        );
        setUploadStatus('success');
      } else {
        setParseMessage('Resume uploaded. Parsing could not extract structured data this time.');
        setUploadStatus('success');
      }
    } catch (err: unknown) {
      setUploadStatus('failed');
      setError(isSmartApiError(err) ? err.message : 'Resume upload failed.');
    }
  };

  const handleDelete = async (objectKey: string) => {
    if (!confirm('Remove this resume from your profile?')) return;
    setDeletingKey(objectKey);
    setError(null);
    try {
      const response = await api.users.deleteResume(objectKey);
      setResumeFiles(response.resumeFiles);
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not remove resume.');
    } finally {
      setDeletingKey(null);
    }
  };

  const busy = uploadStatus === 'uploading' || uploadStatus === 'parsing';
  const slotsRemaining = CANDIDATE_RESUME_FILES_MAX - resumeFiles.length;

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-4 font-[family-name:var(--tpo-font-sans)]"
      aria-label="Resume"
    >
      <ProfileSectionHeader
        title={meta.title}
        description={meta.description}
        action={
          !loading && canAddResume(resumeFiles) ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className={`${profilePrimaryButtonSmClass} justify-center px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em] disabled:opacity-50`}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" strokeWidth={2} aria-hidden />
              )}
              Add resume
            </button>
          ) : null
        }
      />

      {loading ? <p className="text-sm text-[var(--ds-text-muted)]">Loading resumes…</p> : null}

      {!loading && resumeFiles.length === 0 ? (
        <ProfileBentoEmptyPanel
          tipIcon={FileText}
          tipIconClassName="text-[var(--student-info)]"
          tipTitle="Keep versions ready for different roles"
          tipBody={`Store up to ${CANDIDATE_RESUME_FILES_MAX} PDF or Word resumes. SMART can parse the latest upload to suggest profile pre-fill.`}
          emptyIcon={Upload}
          emptyTitle="No resumes yet"
          emptyBody="Upload a resume to attach it to your profile and optionally parse it for faster data entry."
          actions={
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className={`${profilePrimaryButtonSmClass} justify-center px-5 py-2.5 text-[13px] disabled:opacity-50`}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" strokeWidth={2} aria-hidden />
              )}
              Upload your first resume
            </button>
          }
        />
      ) : null}

      {!loading && resumeFiles.length > 0 ? (
        <>
          <p className="text-[13px] text-[var(--ds-text-muted)]">
            {resumeFiles.length} of {CANDIDATE_RESUME_FILES_MAX} slots used
            {slotsRemaining > 0
              ? ` · ${slotsRemaining} remaining`
              : ' · remove a file to upload another'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resumeFiles.map((file, index) => (
              <ResumeEntryCard
                key={file.objectKey}
                file={file}
                accentIndex={index}
                isPrimary={index === 0}
                deleting={deletingKey === file.objectKey}
                onDelete={() => void handleDelete(file.objectKey)}
              />
            ))}
          </div>
        </>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void startUpload(file);
          event.target.value = '';
        }}
      />

      {busy ? (
        <p className="text-sm text-[var(--ds-text-secondary)]">
          {uploadStatus === 'uploading' ? 'Uploading resume…' : 'Parsing resume…'}
        </p>
      ) : null}

      {parseMessage ? (
        <div className="rounded-[18px] border border-[var(--ds-green)]/20 bg-[var(--ds-green-soft)]/50 px-4 py-3.5 text-sm text-[var(--ds-text)]">
          {parseMessage}
        </div>
      ) : null}

      {error ? (
        <ProfileSectionError>
          <span className="inline-flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </span>
        </ProfileSectionError>
      ) : null}
    </section>
  );
}
