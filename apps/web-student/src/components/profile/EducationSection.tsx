'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, Calendar, X } from 'lucide-react';
import type { CandidateEducationDto } from '@smart/contracts';
import { api } from '@/lib/api';

export function EducationSection() {
  const [educationList, setEducationList] = useState<CandidateEducationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchEducation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.users.listEducation();
      setEducationList(res);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load education entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEducation();
  }, []);

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
      setError((err as Error)?.message || 'Failed to delete education entry.');
    }
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="education-heading">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="education-heading" className="text-xl font-semibold tracking-tight text-white">
            Education
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Manage your degrees, institutions, fields of study, and academic timeline.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[#00fad0] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00fad0]/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Education
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/40">Loading education entries…</p>
      ) : educationList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <GraduationCap className="h-10 w-10 text-white/20" />
          <p className="mt-2 text-sm font-medium text-white/60">No education entries added yet</p>
          <p className="text-xs text-white/40">
            Add your university or high school education history.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {educationList.map((edu) => (
            <div
              key={edu.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00fad0]/10 text-[#00fad0]">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{edu.institutionName}</h3>
                    {edu.current && (
                      <span className="rounded-full bg-[#00fad0]/15 px-2 py-0.5 text-[10px] font-semibold text-[#00fad0]">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/70">
                    {edu.degree} in {edu.fieldOfStudy}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
                    {(edu.startDate || edu.endDate || edu.current) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {edu.startDate ? edu.startDate : 'N/A'} —{' '}
                        {edu.current ? 'Present' : edu.endDate || 'N/A'}
                      </span>
                    )}
                    {edu.grade && <span>Grade / Score: {edu.grade}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => openEditModal(edu)}
                  className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  title="Edit Education"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(edu.id)}
                  className="rounded-lg p-2 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  title="Delete Education"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? 'Edit Education' : 'Add Education'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              {formError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/70">
                  Institution Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#00fad0] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-white/70">
                    Degree <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. Bachelor of Science"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#00fad0] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70">
                    Field of Study <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#00fad0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-white/70">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#00fad0] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70">End Date</label>
                  <input
                    type="date"
                    disabled={current}
                    value={current ? '' : endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#00fad0] focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="current-edu"
                  checked={current}
                  onChange={(e) => setCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#00fad0] focus:ring-[#00fad0]"
                />
                <label htmlFor="current-edu" className="text-xs font-medium text-white/80">
                  I am currently studying here
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70">Grade / CGPA</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 3.8 GPA or 85%"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#00fad0] focus:outline-none"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#00fad0] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00fad0]/80 disabled:opacity-50"
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
