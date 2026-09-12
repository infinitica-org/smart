'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import {
  CreateJobOpeningRequestSchema,
  EMPLOYMENT_TYPES,
  JOB_OPENING_STATUSES,
  SKILL_CATEGORY_IDS,
  SKILL_CATEGORIES,
  SKILL_DEFINITIONS,
  SKILL_TAXONOMY_DOMAINS,
  type SkillCategoryId,
  SKILL_PROFICIENCIES,
  type JobOpeningDto,
  type JobOpeningStatus,
  type SkillProficiency,
} from '@smart/contracts';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@smart/ui';
import { openingsApi } from '../lib/api';

type FormState = {
  companyName: string;
  roleTitle: string;
  domain: string;
  categoryId: string;
  minYearsExperience: string;
  maxYearsExperience: string;
  location: string;
  employmentType: string;
  headcount: string;
};

const EMPTY_FORM: FormState = {
  companyName: '',
  roleTitle: '',
  domain: 'SOFTWARE_IT',
  categoryId: '',
  minYearsExperience: '0',
  maxYearsExperience: '0',
  location: '',
  employmentType: 'FULL_TIME',
  headcount: '1',
};

const selectClass =
  'h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 text-sm';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

function labelFor(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function skillNameFor(code: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === code)?.name ?? code;
}

export function OpeningsWorkspace() {
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'create'>('inbox');
  const [statusFilter, setStatusFilter] = useState<JobOpeningStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [inspectedOpening, setInspectedOpening] = useState<JobOpeningDto | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [skills, setSkills] = useState<Map<string, SkillProficiency>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadOpenings(statusToFetch?: JobOpeningStatus | 'ALL') {
    setLoading(true);
    setListError(null);
    const filter = statusToFetch ?? statusFilter;
    try {
      const query = filter !== 'ALL' ? { status: filter } : undefined;
      const res = await openingsApi.list(query);
      setOpenings(res.openings);
    } catch (caught) {
      setListError(errorMessage(caught, 'Could not load job openings.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOpenings();
  }, []);

  async function handleFilterChange(filter: JobOpeningStatus | 'ALL') {
    setStatusFilter(filter);
    await loadOpenings(filter);
  }

  async function handleInspectOpening(openingId: string) {
    setSelectedOpeningId(openingId);
    setInspectLoading(true);
    setInspectError(null);
    try {
      const dto = await openingsApi.get(openingId);
      setInspectedOpening(dto);
    } catch (caught) {
      setInspectError(errorMessage(caught, 'Could not load opening details.'));
      // Fallback to locally loaded item if available
      const local = openings.find((o) => o.openingId === openingId);
      if (local) setInspectedOpening(local);
    } finally {
      setInspectLoading(false);
    }
  }

  function handleCloseInspection() {
    setSelectedOpeningId(null);
    setInspectedOpening(null);
    setInspectError(null);
  }

  const visibleSkills = SKILL_DEFINITIONS.filter(
    (skill) => !form.categoryId || skill.categoryId === form.categoryId,
  );

  function updateSkill(code: string, selected: boolean) {
    setSkills((current) => {
      const next = new Map(current);
      if (selected) next.set(code, 'BEGINNER');
      else next.delete(code);
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    const parsed = CreateJobOpeningRequestSchema.safeParse({
      ...form,
      categoryId: (form.categoryId as SkillCategoryId) || undefined,
      minYearsExperience: Number(form.minYearsExperience),
      maxYearsExperience: Number(form.maxYearsExperience),
      headcount: Number(form.headcount),
      requiredSkills: [...skills].map(([skillCode, minProficiency]) => ({
        skillCode,
        minProficiency,
      })),
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the opening details.');
      return;
    }

    setSubmitting(true);
    try {
      await openingsApi.create(parsed.data);
      setForm(EMPTY_FORM);
      setSkills(new Map());
      setSuccess('Job opening created in Draft status.');
      await loadOpenings();
    } catch (caught) {
      setFormError(errorMessage(caught, 'Could not create the job opening.'));
    } finally {
      setSubmitting(false);
    }
  }

  const filteredOpenings = openings.filter((opening) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      opening.roleTitle.toLowerCase().includes(query) ||
      opening.companyName.toLowerCase().includes(query) ||
      (opening.location && opening.location.toLowerCase().includes(query)) ||
      labelFor(opening.domain).toLowerCase().includes(query)
    );
  });

  return (
    <main className="mx-auto max-w-[1400px] space-y-8 font-sans select-none pb-12">
      {/* Header Bar */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#004C63]/10 text-[#004C63] text-xs font-bold mb-2 border border-[#004C63]/20">
            TPO Concierge
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Job Openings & JD Inbox
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-500 font-medium">
            Review incoming job descriptions and manage structured candidate placement requirements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'inbox' ? 'primary' : 'outline'}
            className={
              activeTab === 'inbox'
                ? 'bg-[#004C63] hover:bg-[#0A4D5C] text-white font-bold text-xs rounded-xl shadow-xs'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl'
            }
            onClick={() => setActiveTab('inbox')}
          >
            JD Inbox ({openings.length})
          </Button>
          <Button
            variant={activeTab === 'create' ? 'primary' : 'outline'}
            className={
              activeTab === 'create'
                ? 'bg-[#004C63] hover:bg-[#0A4D5C] text-white font-bold text-xs rounded-xl shadow-xs'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl'
            }
            onClick={() => setActiveTab('create')}
          >
            Post structured JD
          </Button>
        </div>
      </header>

      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Post a structured JD</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Institution and creator are automatically taken from your authenticated TPO session.
          </CardDescription>
        </CardHeader>
        <form onSubmit={submit} className="grid gap-6 px-6 pb-6 md:px-8 md:pb-8">
          {formError ? (
            <Alert tone="danger" title="Opening not created">
              {formError}
            </Alert>
          ) : null}
          {success ? <Alert tone="info" title={success} /> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Company name"
              value={form.companyName}
              onChange={(event) => setForm({ ...form, companyName: event.target.value })}
              required
            />
            <Input
              label="Role title"
              value={form.roleTitle}
              onChange={(event) => setForm({ ...form, roleTitle: event.target.value })}
              required
            />
            <SelectField
              label="Domain"
              value={form.domain}
              onChange={(domain) => setForm({ ...form, domain })}
              options={SKILL_TAXONOMY_DOMAINS}
            />
            <SelectField
              label="Category (optional)"
              value={form.categoryId}
              onChange={(categoryId) => setForm({ ...form, categoryId })}
              options={SKILL_CATEGORY_IDS}
              emptyLabel="All categories"
              optionLabel={(id) => SKILL_CATEGORIES[id as SkillCategoryId]?.name ?? id}
            />
            <Input
              label="Minimum years experience"
              type="number"
              min={0}
              max={40}
              value={form.minYearsExperience}
              onChange={(event) => setForm({ ...form, minYearsExperience: event.target.value })}
              required
            />
            <Input
              label="Maximum years experience"
              type="number"
              min={0}
              max={40}
              value={form.maxYearsExperience}
              onChange={(event) => setForm({ ...form, maxYearsExperience: event.target.value })}
              required
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              required
            />
            <SelectField
              label="Employment type"
              value={form.employmentType}
              onChange={(employmentType) => setForm({ ...form, employmentType })}
              options={EMPLOYMENT_TYPES}
            />
            <Input
              label="Headcount"
              type="number"
              min={1}
              max={10_000}
              value={form.headcount}
              onChange={(event) => setForm({ ...form, headcount: event.target.value })}
              required
            />
          </div>

          <fieldset className="grid gap-3">
            <legend className="font-bold text-sm text-slate-900">Required skills</legend>
            <p className="text-xs text-slate-500 font-medium">
              Select at least one taxonomy skill and its minimum proficiency.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {visibleSkills.map((skill) => {
                const proficiency = skills.get(skill.code);
                return (
                  <div
                    key={skill.code}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:bg-white transition-all"
                  >
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded text-[#004C63] focus:ring-[#004C63]"
                        checked={proficiency !== undefined}
                        onChange={(event) => updateSkill(skill.code, event.target.checked)}
                      />
                      <span>
                        {skill.name}
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {skill.categoryName}
                        </span>
                      </span>
                    </label>
                    {proficiency ? (
                      <label className="grid gap-1 text-xs">
                        <span className="sr-only">Minimum proficiency for {skill.name}</span>
                        <select
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                          value={proficiency}
                          onChange={(event) =>
                            setSkills(
                              new Map(skills).set(
                                skill.code,
                                event.target.value as SkillProficiency,
                              ),
                            )
                          }
                        >
                          {SKILL_PROFICIENCIES.map((level) => (
                            <option key={level} value={level}>
                              {labelFor(level)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <Button
            type="submit"
            isLoading={submitting}
            disabled={skills.size === 0}
            className="bg-[#004C63] hover:bg-[#0A4D5C] text-white font-bold rounded-xl py-3 shadow-xs transition-all"
          >
            Create opening
          </Button>
        </form>
      </Card>

      {/* JD Inspection Modal / Detail Overlay */}
      {selectedOpeningId && (
        <Card className="rounded-2xl border-2 border-[#004C63] bg-white shadow-xl">
          <CardHeader className="flex flex-row items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl font-extrabold text-slate-900">
                  {inspectedOpening?.roleTitle ?? 'Opening details'}
                </CardTitle>
                {inspectedOpening ? (
                  <Badge
                    variant={
                      inspectedOpening.status === 'OPEN'
                        ? 'default'
                        : inspectedOpening.status === 'DRAFT'
                          ? 'outline'
                          : 'destructive'
                    }
                    className="rounded-full px-3 py-0.5 font-bold text-xs"
                  >
                    {labelFor(inspectedOpening.status)}
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="mt-1 text-sm font-medium text-slate-600">
                {inspectedOpening?.companyName ?? 'Loading details…'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleCloseInspection}
              className="rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-50"
            >
              Close inspection
            </Button>
          </CardHeader>
          <div className="grid gap-6 p-6 md:p-8">
            {inspectLoading ? (
              <p role="status" className="text-sm font-medium text-slate-500">
                Fetching details for opening {selectedOpeningId}…
              </p>
            ) : inspectError ? (
              <Alert tone="danger" title="Could not inspect opening">
                {inspectError}
              </Alert>
            ) : inspectedOpening ? (
              <>
                <div className="grid gap-4 rounded-2xl bg-[#F0FDFA]/60 border border-[#CCFBF1] p-5 text-xs md:grid-cols-3">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-500">
                      Domain
                    </span>
                    <p className="mt-1 font-extrabold text-slate-900 text-sm">
                      {labelFor(inspectedOpening.domain)}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-500">
                      Experience Range
                    </span>
                    <p className="mt-1 font-extrabold text-slate-900 text-sm">
                      {inspectedOpening.minYearsExperience}–{inspectedOpening.maxYearsExperience}{' '}
                      years
                    </p>
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-500">
                      Location
                    </span>
                    <p className="mt-1 font-extrabold text-slate-900 text-sm">
                      {inspectedOpening.location}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-500">
                      Employment Type
                    </span>
                    <p className="mt-1 font-extrabold text-slate-900 text-sm">
                      {labelFor(inspectedOpening.employmentType)}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-500">
                      Headcount
                    </span>
                    <p className="mt-1 font-extrabold text-slate-900 text-sm">
                      {inspectedOpening.headcount} position(s)
                    </p>
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-500">
                      Created Date
                    </span>
                    <p className="mt-1 font-extrabold text-slate-900 text-sm">
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                        new Date(inspectedOpening.createdAt),
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-bold text-slate-900">
                    Required Taxonomy Skills
                  </h4>
                  {inspectedOpening.requiredSkills.length === 0 ? (
                    <p className="text-xs text-slate-500 font-medium">No skill constraints.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200/80 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Skill Name</th>
                            <th className="px-4 py-3">Skill Code</th>
                            <th className="px-4 py-3">Minimum Proficiency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {inspectedOpening.requiredSkills.map((req) => (
                            <tr key={req.skillCode}>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {skillNameFor(req.skillCode)}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                {req.skillCode}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant="outline"
                                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                >
                                  {labelFor(req.minProficiency)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </Card>
      )}

      {/* Opening List Section */}
      <section aria-labelledby="opening-list-heading" className="grid gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 id="opening-list-heading" className="text-lg font-bold text-slate-900">
              Current Openings
            </h2>
            <Badge
              variant="outline"
              className="rounded-full bg-[#F0FDFA] text-[#004C63] border-[#CCFBF1] text-xs font-bold px-3 py-0.5"
            >
              {filteredOpenings.length} total
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500">Status:</span>
              <select
                aria-label="Filter openings by status"
                className="h-10 rounded-xl border border-slate-200/90 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#004C63]"
                value={statusFilter}
                onChange={(e) =>
                  void handleFilterChange(e.target.value as JobOpeningStatus | 'ALL')
                }
              >
                <option value="ALL">All Statuses</option>
                {JOB_OPENING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {labelFor(status)}
                  </option>
                ))}
              </select>
            </div>
            {/* Search Input */}
            <input
              type="search"
              aria-label="Search openings"
              placeholder="Search role, company, location…"
              className="h-10 w-48 sm:w-64 rounded-xl border border-slate-200/90 bg-slate-50 px-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#004C63] focus:bg-white transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => void loadOpenings()}
              disabled={loading}
              className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>

        <Card className="bg-white border border-slate-200/80 shadow-xs overflow-hidden rounded-2xl">
          {listError ? (
            <div className="p-6">
              <Alert tone="danger" title="Openings unavailable">
                {listError}
              </Alert>
            </div>
          ) : loading ? (
            <p role="status" className="p-8 text-sm font-medium text-slate-500">
              Loading openings…
            </p>
          ) : filteredOpenings.length === 0 ? (
            <div className="p-12 text-center text-sm font-medium text-slate-500">
              No job openings yet. Create the first structured JD using the Post button above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Company / Role</th>
                    <th className="px-6 py-4">Domain</th>
                    <th className="px-6 py-4">Experience</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Headcount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOpenings.map((opening) => (
                    <tr key={opening.openingId} className="hover:bg-[#F0FDFA]/40 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{opening.roleTitle}</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {opening.companyName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {labelFor(opening.domain)}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {opening.minYearsExperience}–{opening.maxYearsExperience} years
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {opening.location}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {labelFor(opening.employmentType)}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">
                        {opening.headcount}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            opening.status === 'OPEN'
                              ? 'default'
                              : opening.status === 'DRAFT'
                                ? 'outline'
                                : 'destructive'
                          }
                          className="rounded-full px-3 py-0.5 text-xs font-bold"
                        >
                          {labelFor(opening.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                          new Date(opening.createdAt),
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-50 h-8 px-3"
                            onClick={() => void handleInspectOpening(opening.openingId)}
                          >
                            Inspect JD
                          </Button>
                          <Link
                            href={`/suggestions?openingId=${opening.openingId}`}
                            className="inline-flex items-center justify-center bg-[#004C63] hover:bg-[#0A4D5C] text-white text-xs font-bold h-8 px-3 rounded-xl shadow-xs transition-all"
                          >
                            Suggestions
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  emptyLabel,
  optionLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  emptyLabel?: string;
  optionLabel?: (value: string) => string;
}) {
  const formatOption = optionLabel ?? labelFor;
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className={selectClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {emptyLabel ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
