'use client';

import { useState } from 'react';
import { FileText, GraduationCap, Plus, Pencil, Trash2, Calendar, Upload, X } from 'lucide-react';
import type { CandidateEducationDocumentDto, CandidateEducationDto } from '@smart/contracts';
import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';

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

  // Form Fields
  const [institutionName, setInstitutionName] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [current, setCurrent] = useState(false);
  const [grade, setGrade] = useState('');

  const [docModalEducationId, setDocModalEducationId] = useState<string | null>(null);
  const [docType, setDocType] =
    useState<CandidateEducationDocumentDto['documentType']>('DEGREE_CERTIFICATE');
  const [fileName, setFileName] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const DOCUMENT_TYPE_LABELS: Record<CandidateEducationDocumentDto['documentType'], string> = {
    DEGREE_CERTIFICATE: 'Degree certificate',
    MARKSHEET: 'Marksheet',
    TRANSCRIPT: 'Transcript',
    OTHER: 'Other proof',
  };

  const fetchEducation = async () => {
    await refetch();
  };

  const openCreateModal = () => {
    setEditingId(null);
    setInstitutionName('');
    setDegree('');
    setFieldOfStudy('');
    setStartDate('');
    setEndDate('');
    setCurrent(false);
    setGrade('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CandidateEducationDto) => {
    setEditingId(item.id);
    setInstitutionName(item.institutionName ?? '');
    setDegree(item.degree ?? '');
    setFieldOfStudy(item.fieldOfStudy ?? '');
    setStartDate(item.startDate || '');
    setEndDate(item.endDate || '');
    setCurrent(Boolean(item.current));
    setGrade(item.grade || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim()) {
      setFormError('Institution name is required.');
      return;
    }
    if (!degree.trim()) {
      setFormError('Degree is required.');
      return;
    }
    if (!fieldOfStudy.trim()) {
      setFormError('Field of study is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const payload = {
        institutionName: institutionName.trim(),
        degree: degree.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        startDate: startDate ? startDate : undefined,
        endDate: current ? undefined : endDate ? endDate : undefined,
        current,
        grade: grade.trim() ? grade.trim() : undefined,
      };

      if (editingId) {
        await api.users.updateEducation(editingId, payload);
      } else {
        await api.users.createEducation(payload);
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
    setDocType('DEGREE_CERTIFICATE');
    setFileName('');
    setFileSizeBytes(0);
  };

  const handleAttachProof = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!docModalEducationId || !fileName) return;
    try {
      setUploadingDoc(true);
      await api.users.attachEducationDocument(docModalEducationId, {
        documentType: docType,
        fileName,
        fileUrl: `storage/education-proofs/${fileName.toLowerCase().replace(/[^a-z0-9.]/g, '_')}`,
        fileSizeBytes: fileSizeBytes || 1,
        mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png',
      });
      setDocModalEducationId(null);
      setFileName('');
      await fetchEducation();
    } catch (err: unknown) {
      setFormError((err as Error)?.message || 'Failed to attach education proof.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveProof = async (educationId: string, documentId: string) => {
    if (!confirm('Remove this education proof document?')) return;
    try {
      await api.users.removeEducationDocument(educationId, documentId);
      await fetchEducation();
    } catch (err: unknown) {
      setFormError((err as Error)?.message || 'Failed to remove education proof.');
    }
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="education-heading">
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="education-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Education
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your degrees, institutions, fields of study, and academic timeline.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Education
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading education entries…</p>
      ) : educationList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/50 p-8 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-foreground/80">
            No education entries added yet
          </p>
          <p className="text-xs text-muted-foreground">
            Add your university or high school education history.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {educationList.map((edu) => (
            <div
              key={edu.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-muted/50 p-5 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground/10 text-foreground">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{edu.institutionName}</h3>
                    {edu.current && (
                      <span className="rounded-full bg-foreground/15 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        Current
                      </span>
                    )}
                    {edu.status === 'verified' && (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        Verified
                      </span>
                    )}
                    {edu.status === 'rejected' && (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        Rejected
                      </span>
                    )}
                    {(!edu.status || edu.status === 'unverified') && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        Unverified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80">
                    {edu.degree} in {edu.fieldOfStudy}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {(edu.startDate || edu.endDate || edu.current) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {edu.startDate ? edu.startDate : 'N/A'} —{' '}
                        {edu.current ? 'Present' : edu.endDate || 'N/A'}
                      </span>
                    )}
                    {edu.grade && <span>Grade / Score: {edu.grade}</span>}
                  </div>
                  {edu.status === 'rejected' && edu.rejectionReason && (
                    <p className="mt-1.5 text-xs text-red-700">
                      Rejection Reason: {edu.rejectionReason}
                    </p>
                  )}
                  <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Proof documents
                      </p>
                      <button
                        type="button"
                        onClick={() => openProofModal(edu.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                      >
                        <Upload className="h-3 w-3" />
                        Add proof
                      </button>
                    </div>
                    {(edu.documents ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No proof uploaded yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(edu.documents ?? []).map((doc) => (
                          <li
                            key={doc.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                <FileText className="h-3.5 w-3.5 text-foreground" />
                                {DOCUMENT_TYPE_LABELS[doc.documentType]}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {doc.fileName}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveProof(edu.id, doc.id)}
                              className="shrink-0 text-[11px] font-semibold text-red-700 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => openEditModal(edu)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Edit Education"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(edu.id)}
                  className="rounded-lg p-2 text-red-600/80 hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="Delete Education"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {docModalEducationId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Add education proof</h3>
              <button
                type="button"
                onClick={() => setDocModalEducationId(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAttachProof} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground/80">
                  Document type
                </label>
                <select
                  value={docType}
                  onChange={(event) =>
                    setDocType(event.target.value as CandidateEducationDocumentDto['documentType'])
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/80">Proof file</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setFileName(file.name);
                    setFileSizeBytes(file.size);
                  }}
                  className="mt-1 block w-full text-sm text-foreground/80"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setDocModalEducationId(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc || !fileName}
                  className="rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50"
                >
                  {uploadingDoc ? 'Uploading…' : 'Attach proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Edit Education' : 'Add Education'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              {formError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground/80">
                  Institution Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Degree <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. Bachelor of Science"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Field of Study <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-foreground/80">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80">End Date</label>
                  <input
                    type="date"
                    disabled={current}
                    value={current ? '' : endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="current-edu"
                  checked={current}
                  onChange={(e) => setCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-background text-foreground focus:ring-foreground"
                />
                <label htmlFor="current-edu" className="text-xs font-medium text-foreground/80">
                  I am currently studying here
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80">Grade / CGPA</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 3.8 GPA or 85%"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/80 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
