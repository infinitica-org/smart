'use client';

import { useState } from 'react';
import { GraduationCap, Plus, School } from 'lucide-react';
import { EducationEntryCard } from '@/components/profile/EducationEntryCard';
import { EducationProofUploadModal } from '@/components/profile/EducationProofUploadModal';
import type { CandidateEducationDocumentDto, CandidateEducationDto } from '@smart/contracts';
import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';
import { EducationDetailsModal } from '@/components/profile/EducationDetailsModal';
import {
  educationDtoToFormValues,
  educationFormToPayload,
  emptyEducationFormValues,
  validateEducationForm,
  type EducationFormValues,
} from '@/lib/education-form';
import {
  ProfileBentoEmptyPanel,
  ProfileSectionError,
  ProfileSectionHeader,
} from '@/components/profile/ProfileSectionChrome';
import { profilePrimaryButtonSmClass } from '@/lib/profile-ui-classes';
import { profileSectionMeta } from '@/lib/profile-sections';

export function EducationSection() {
  const {
    data: educationList = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.myEducation(),
    queryFn: () => api.users.listEducation(),
    staleTime: 60_000,
  });
  const error = queryError
    ? (queryError as Error).message || 'Failed to load education entries.'
    : null;

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalInitialValues, setModalInitialValues] = useState<EducationFormValues>(
    emptyEducationFormValues(),
  );
  /** Bumps on each "Add education" open so an abandoned create form never remounts with stale state. */
  const [createModalSession, setCreateModalSession] = useState(0);

  const [docModalEducationId, setDocModalEducationId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchEducation = async () => {
    await refetch();
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormError(null);
    setModalInitialValues(emptyEducationFormValues());
    setCreateModalSession((session) => session + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CandidateEducationDto) => {
    setEditingId(item.id);
    setFormError(null);
    setModalInitialValues(educationDtoToFormValues(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormError(null);
    setModalInitialValues(emptyEducationFormValues());
  };

  const handleModalSubmit = async (values: EducationFormValues) => {
    const validationError = validateEducationForm(values);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const payload = educationFormToPayload(values);

      let educationId = editingId;
      if (editingId) {
        await api.users.updateEducation(editingId, payload);
      } else {
        const created = await api.users.createEducation(payload);
        educationId = created.id;
      }

      if (values.courseProofFile && educationId) {
        const file = values.courseProofFile;
        await api.users.attachEducationDocument(educationId, {
          documentType: 'MARKSHEET',
          fileName: file.name,
          fileUrl: `storage/education-proofs/${file.name.toLowerCase().replace(/[^a-z0-9.]/g, '_')}`,
          fileSizeBytes: file.size || 1,
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
        });
      }

      closeModal();
      await fetchEducation();
    } catch (err: unknown) {
      setFormError((err as Error)?.message || 'Failed to save education entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education entry?')) return;
    try {
      await api.users.deleteEducation(id);
      await fetchEducation();
    } catch (err: unknown) {
      setFormError((err as Error)?.message || 'Failed to delete education entry.');
    }
  };

  const openProofModal = (educationId: string) => {
    setDocModalEducationId(educationId);
  };

  const handleAttachProof = async (payload: {
    documentType: CandidateEducationDocumentDto['documentType'];
    file: File;
  }) => {
    if (!docModalEducationId) return;
    const { file, documentType } = payload;
    const fileName = file.name;
    try {
      setUploadingDoc(true);
      await api.users.attachEducationDocument(docModalEducationId, {
        documentType,
        fileName,
        fileUrl: `storage/education-proofs/${fileName.toLowerCase().replace(/[^a-z0-9.]/g, '_')}`,
        fileSizeBytes: file.size || 1,
        mimeType: file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
      });
      setDocModalEducationId(null);
      await fetchEducation();
    } catch (err: unknown) {
      setFormError((err as Error)?.message || 'Failed to attach education proof.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const meta = profileSectionMeta('education');

  return (
    <section
      className="flex flex-col gap-4 font-[family-name:var(--tpo-font-sans)]"
      aria-label="Education"
    >
      <ProfileSectionHeader
        title={meta.title}
        description={meta.description}
        action={
          !loading && educationList.length > 0 ? (
            <button
              type="button"
              onClick={openCreateModal}
              className={`${profilePrimaryButtonSmClass} justify-center px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em]`}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              Add education
            </button>
          ) : null
        }
      />

      {error ? <ProfileSectionError>{error}</ProfileSectionError> : null}

      {loading ? (
        <p className="text-sm text-[var(--ds-text-muted)]">Loading education entries…</p>
      ) : null}

      {!loading && educationList.length === 0 ? (
        <ProfileBentoEmptyPanel
          tipIcon={School}
          tipIconClassName="text-[#0284c7]"
          tipTitle="Build your academic story"
          tipBody="Add degrees, boards, and scores so recruiters see verified education — not just a line on a resume."
          emptyIcon={GraduationCap}
          emptyTitle="No education entries yet"
          emptyBody="When you add a program, it appears here with duration, results, and document status."
          actions={
            <button
              type="button"
              onClick={openCreateModal}
              className={`${profilePrimaryButtonSmClass} justify-center px-5 py-2.5 text-[13px]`}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              Add your first education
            </button>
          }
        />
      ) : null}

      {!loading && educationList.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {educationList.map((edu, index) => (
            <EducationEntryCard
              key={edu.id}
              education={edu}
              accentIndex={index}
              onEdit={() => openEditModal(edu)}
              onDelete={() => void handleDelete(edu.id)}
              onAddProof={() => openProofModal(edu.id)}
            />
          ))}
        </div>
      ) : null}

      <EducationProofUploadModal
        open={docModalEducationId !== null}
        uploading={uploadingDoc}
        onClose={() => setDocModalEducationId(null)}
        onSubmit={(payload) => void handleAttachProof(payload)}
      />

      {isModalOpen ? (
        <EducationDetailsModal
          key={editingId ?? `create-${createModalSession}`}
          open
          mode={editingId ? 'edit' : 'create'}
          initialValues={modalInitialValues}
          submitting={submitting}
          formError={formError}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
        />
      ) : null}
    </section>
  );
}
