'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import {
  CreateJobOpeningRequestSchema,
  EMPLOYMENT_TYPES,
  JOB_OPENING_STATUSES,
  SKILL_DEFINITIONS,
  SKILL_STREAMS,
  SKILL_TAXONOMY_DOMAINS,
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
  stream: string;
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
  stream: '',
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
    (skill) => !form.stream || skill.stream === 'UNIVERSAL' || skill.stream === form.stream,
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
      stream: form.stream || undefined,
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
    <main className="mx-auto grid max-w-6xl gap-8 p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">TPO concierge</p>
          <h1 className="text-3xl font-semibold">Job openings & JD Inbox</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Review incoming job descriptions and manage structured requirements.
          </p>
        </div>
        <div className="flex items-center gap-2 border-b border-[var(--surface-border)] sm:border-b-0">
          <Button
            variant={activeTab === 'inbox' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('inbox')}
          >
            JD Inbox ({openings.length})
          </Button>
          <Button
            variant={activeTab === 'create' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('create')}
          >
            Post structured JD
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Post a structured JD</CardTitle>
          <CardDescription>
            Institution and creator are taken from your authenticated TPO session.
          </CardDescription>
        </CardHeader>
        <form onSubmit={submit} className="grid gap-6 px-6 pb-6">
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
              label="Stream (optional)"
              value={form.stream}
              onChange={(stream) => setForm({ ...form, stream })}
              options={SKILL_STREAMS}
              emptyLabel="All streams / not specified"
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
            <legend className="font-medium">Required skills</legend>
            <p className="text-sm text-[var(--text-muted)]">
              Select at least one taxonomy skill and its minimum proficiency.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {visibleSkills.map((skill) => {
                const proficiency = skills.get(skill.code);
                return (
                  <div
                    key={skill.code}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-[var(--surface-border)] p-3"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={proficiency !== undefined}
                        onChange={(event) => updateSkill(skill.code, event.target.checked)}
                      />
                      <span>
                        {skill.name}
                        <span className="block text-xs text-[var(--text-muted)]">
                          {labelFor(skill.stream)}
                        </span>
                      </span>
                    </label>
                    {proficiency ? (
                      <label className="grid gap-1 text-xs">
                        <span>Minimum proficiency for {skill.name}</span>
                        <select
                          className={selectClass}
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

          <Button type="submit" isLoading={submitting} disabled={skills.size === 0}>
            Create opening
          </Button>
        </form>
      </Card>

      {/* JD Inspection Modal / Detail Drawer */}
      {selectedOpeningId && (
        <Card className="border-brand-500 border-2 bg-[var(--surface)]">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">
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
                  >
                    {labelFor(inspectedOpening.status)}
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="mt-1 text-base">
                {inspectedOpening?.companyName ?? 'Loading details…'}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleCloseInspection}>
              Close inspection
            </Button>
          </CardHeader>
          <div className="grid gap-6 p-6 pt-0">
            {inspectLoading ? (
              <p role="status" className="text-sm text-[var(--text-muted)]">
                Fetching details for opening {selectedOpeningId}…
              </p>
            ) : inspectError ? (
              <Alert tone="danger" title="Could not inspect opening">
                {inspectError}
              </Alert>
            ) : inspectedOpening ? (
              <>
                <div className="grid gap-4 rounded-lg bg-[var(--surface-muted)] p-4 text-sm md:grid-cols-3">
                  <div>
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Domain
                    </span>
                    <p className="mt-1 font-medium">{labelFor(inspectedOpening.domain)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Experience Range
                    </span>
                    <p className="mt-1 font-medium">
                      {inspectedOpening.minYearsExperience}–{inspectedOpening.maxYearsExperience}{' '}
                      years
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Location
                    </span>
                    <p className="mt-1 font-medium">{inspectedOpening.location}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Employment Type
                    </span>
                    <p className="mt-1 font-medium">{labelFor(inspectedOpening.employmentType)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Headcount
                    </span>
                    <p className="mt-1 font-medium">{inspectedOpening.headcount} position(s)</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Created Date
                    </span>
                    <p className="mt-1 font-medium">
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                        new Date(inspectedOpening.createdAt),
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold">Required Taxonomy Skills</h4>
                  {inspectedOpening.requiredSkills.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No skill constraints.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-[var(--surface-border)]">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b bg-[var(--surface-muted)] text-xs uppercase text-[var(--text-muted)]">
                          <tr>
                            <th className="px-4 py-2">Skill Name</th>
                            <th className="px-4 py-2">Skill Code</th>
                            <th className="px-4 py-2">Minimum Proficiency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectedOpening.requiredSkills.map((req) => (
                            <tr key={req.skillCode} className="border-b last:border-0">
                              <td className="px-4 py-2.5 font-medium">
                                {skillNameFor(req.skillCode)}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-xs">{req.skillCode}</td>
                              <td className="px-4 py-2.5">
                                <Badge variant="outline">{labelFor(req.minProficiency)}</Badge>
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

      <section aria-labelledby="opening-list-heading" className="grid gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 id="opening-list-heading" className="text-2xl font-semibold">
              Current openings
            </h2>
            <Badge variant="outline">{filteredOpenings.length} total</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-muted)]">Status:</span>
              <select
                aria-label="Filter openings by status"
                className={selectClass}
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
              className={`${selectClass} w-48 sm:w-64`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outline" onClick={() => void loadOpenings()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Workflow status displays available opening states (
          <code className="font-semibold">DRAFT</code>, <code className="font-semibold">OPEN</code>,{' '}
          <code className="font-semibold">CLOSED</code>). Candidate matching (AC-T04) and
          shortlisting (AC-T05) advance ATS stages downstream.
        </p>

        {listError ? (
          <Alert tone="danger" title="Openings unavailable">
            {listError}
          </Alert>
        ) : loading ? (
          <p role="status" className="text-sm text-[var(--text-muted)]">
            Loading openings…
          </p>
        ) : filteredOpenings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--surface-border)] p-6 text-sm text-[var(--text-muted)]">
            No job openings yet. Create the first structured JD above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3 pr-4">Company / role</th>
                  <th className="py-3 pr-4">Domain</th>
                  <th className="py-3 pr-4">Experience</th>
                  <th className="py-3 pr-4">Location</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Headcount</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpenings.map((opening) => (
                  <tr key={opening.openingId} className="border-b align-top">
                    <td className="py-3 pr-4">
                      <span className="font-medium">{opening.roleTitle}</span>
                      <span className="block text-[var(--text-muted)]">{opening.companyName}</span>
                    </td>
                    <td className="py-3 pr-4">{labelFor(opening.domain)}</td>
                    <td className="py-3 pr-4">
                      {opening.minYearsExperience}–{opening.maxYearsExperience} years
                    </td>
                    <td className="py-3 pr-4">{opening.location}</td>
                    <td className="py-3 pr-4">{labelFor(opening.employmentType)}</td>
                    <td className="py-3 pr-4">{opening.headcount}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          opening.status === 'OPEN'
                            ? 'default'
                            : opening.status === 'DRAFT'
                              ? 'outline'
                              : 'destructive'
                        }
                      >
                        {labelFor(opening.status)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                        new Date(opening.createdAt),
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col items-start gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleInspectOpening(opening.openingId)}
                        >
                          Inspect JD
                        </Button>
                        <Link
                          href={`/suggestions?openingId=${opening.openingId}`}
                          className="text-xs font-semibold text-brand-600 hover:underline"
                        >
                          View suggestions
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  emptyLabel?: string;
}) {
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
            {labelFor(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
