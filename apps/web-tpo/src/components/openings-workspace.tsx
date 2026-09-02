'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import {
  CreateJobOpeningRequestSchema,
  EMPLOYMENT_TYPES,
  SKILL_DEFINITIONS,
  SKILL_STREAMS,
  SKILL_TAXONOMY_DOMAINS,
  SKILL_PROFICIENCIES,
  type JobOpeningDto,
  type SkillProficiency,
} from '@smart/contracts';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
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

export function OpeningsWorkspace() {
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [skills, setSkills] = useState<Map<string, SkillProficiency>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadOpenings() {
    setLoading(true);
    setListError(null);
    try {
      setOpenings((await openingsApi.list()).openings);
    } catch (caught) {
      setListError(errorMessage(caught, 'Could not load job openings.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOpenings();
  }, []);

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

  return (
    <main className="mx-auto grid max-w-6xl gap-8 p-8">
      <header>
        <p className="text-sm font-medium text-brand-600">TPO concierge</p>
        <h1 className="text-3xl font-semibold">Job openings</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Capture a structured role using the verified INF-05 skill taxonomy.
        </p>
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

      <section aria-labelledby="opening-list-heading" className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="opening-list-heading" className="text-2xl font-semibold">
            Current openings
          </h2>
          <Button variant="outline" onClick={() => void loadOpenings()} disabled={loading}>
            Refresh
          </Button>
        </div>
        {listError ? (
          <Alert tone="danger" title="Openings unavailable">
            {listError}
          </Alert>
        ) : loading ? (
          <p role="status" className="text-sm text-[var(--text-muted)]">
            Loading openings…
          </p>
        ) : openings.length === 0 ? (
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
                  <th className="py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {openings.map((opening) => (
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
                    <td className="py-3 pr-4">{labelFor(opening.status)}</td>
                    <td className="py-3">
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                        new Date(opening.createdAt),
                      )}
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
