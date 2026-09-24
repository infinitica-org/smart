'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCheck, Search, Plus } from 'lucide-react';
import { Badge, PageHeader } from '../../../components/ui';
import { LevelBadge } from '../../../components/level-badge';
import { companyJobsApi } from '../../../lib/api';
import type { Applicant, Job, PipelineStage } from '../../../lib/types';
import { PIPELINE_STAGES } from '../../../lib/types';
import {
  card,
  cardMuted,
  input,
  pageStack,
  primaryButton,
  secondaryButton,
  segmentOff,
  segmentOn,
  segmentedShell,
  table,
  tableCell,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableShell,
} from '../../../lib/ui';

type View = 'list' | 'pipeline';

export default function ApplicantsPage() {
  const [view, setView] = useState<View>('list');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [applicants, _setApplicants] = useState<Applicant[]>([]);
  const [stages, setStages] = useState<Record<string, PipelineStage>>({});
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await companyJobsApi.list();
        if (res?.openings && Array.isArray(res.openings)) {
          const mappedJobs: Job[] = res.openings.map((item) => ({
            id: item.openingId,
            title: item.roleTitle,
            applicants: 0,
            status: item.status === 'OPEN' ? 'Active' : 'Draft',
            skills: item.requiredSkills.map((s) => ({
              name: s.skillCode,
              level: 'Intermediate',
            })),
          }));
          setJobs(mappedJobs);
          if (mappedJobs.length > 0 && mappedJobs[0]) {
            setSelectedJobId(mappedJobs[0].id);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }
    void loadJobs();
  }, []);

  const filteredApplicants =
    selectedJobId === 'all' ? applicants : applicants.filter((a) => a.jobId === selectedJobId);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  function moveTo(id: string, stage: PipelineStage) {
    setStages((prev) => ({ ...prev, [id]: stage }));
  }

  return (
    <div className={pageStack}>
      <PageHeader
        title="Applicants"
        description="Review candidate profiles and move verified applicants through your hiring pipeline."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/students" className={secondaryButton}>
              <Search className="size-4" />
              Search candidates
            </Link>
            <div className={segmentedShell} role="tablist" aria-label="Applicants view">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'list'}
                onClick={() => setView('list')}
                className={view === 'list' ? segmentOn : segmentOff}
              >
                By job
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'pipeline'}
                onClick={() => setView('pipeline')}
                className={view === 'pipeline' ? segmentOn : segmentOff}
              >
                Pipeline
              </button>
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-[20px] border border-[var(--ds-border)] bg-white">
          <p className="text-sm text-[var(--ds-text-muted)]">Loading applicants...</p>
        </div>
      ) : view === 'list' ? (
        <section className={`${card} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--ds-text)]">
              {selectedJob ? `${selectedJob.title} — Applicants` : 'All Applicants'}
            </h2>
            {jobs.length > 0 ? (
              <select
                aria-label="Filter by job"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className={`${input} max-w-[260px]`}
              >
                <option value="all">All Jobs ({applicants.length})</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {filteredApplicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 mb-3">
                <UserCheck className="size-6" />
              </div>
              <p className="text-sm font-semibold text-[var(--ds-text)]">No applicants yet</p>
              <p className="mt-1 max-w-md text-[13px] text-[var(--ds-text-muted)]">
                When students apply to your open positions, their verified skill credentials and
                project defences will appear here.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Link href="/jobs/new" className={primaryButton}>
                  <Plus className="size-4" />
                  Post a job
                </Link>
                <Link href="/students" className={secondaryButton}>
                  <Search className="size-4" />
                  Browse verified talent
                </Link>
              </div>
            </div>
          ) : (
            <div className={tableShell}>
              <table className={table}>
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={tableHeadCell}>Name</th>
                    <th className={tableHeadCell}>Trust score</th>
                    <th className={tableHeadCell}>Verification</th>
                    <th className={`${tableHeadCell} text-right`}>&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicants.map((a) => (
                    <tr key={a.id} className={tableRow}>
                      <td className={tableCell}>
                        <p className="font-semibold text-[var(--ds-text)]">{a.name}</p>
                        <p className="text-[12px] text-[var(--ds-text-muted)]">{a.school}</p>
                      </td>
                      <td className={`${tableCell} font-semibold text-[var(--ds-text)]`}>
                        {a.trust}
                      </td>
                      <td className={tableCell}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <LevelBadge skill={a.skill} level={a.level} />
                          {a.endorsed ? <Badge tone="green">✓ Endorsed</Badge> : null}
                          {a.projectDefended ? (
                            <Badge tone="green">✓ Project defended</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${tableCell} text-right`}>
                        <Link href="/students" className={secondaryButton}>
                          View profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section
          aria-label="Candidate pipeline"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {PIPELINE_STAGES.map((stage) => {
            const inStage = applicants.filter((a) => (stages[a.id] ?? 'Applied') === stage);
            return (
              <div
                key={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverStage(stage);
                }}
                onDragLeave={() => setOverStage((current) => (current === stage ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragId) moveTo(dragId, stage);
                  setDragId(null);
                  setOverStage(null);
                }}
                className={`${cardMuted} min-h-[220px] transition-colors ${
                  overStage === stage ? 'border-[var(--co-teal)] bg-[var(--co-mint-soft)]' : ''
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[13px] font-semibold text-[var(--ds-text)]">{stage}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--ds-text-muted)]">
                    {inStage.length}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {inStage.map((a) => (
                    <li
                      key={a.id}
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStage(null);
                      }}
                      className="cursor-grab rounded-[14px] border border-[var(--ds-border)] bg-white p-3 shadow-[var(--ds-card-shadow)] active:cursor-grabbing"
                    >
                      <p className="text-[13px] font-semibold text-[var(--ds-text)]">{a.name}</p>
                      <p className="text-[12px] text-[var(--ds-text-muted)]">
                        {jobs.find((j) => j.id === a.jobId)?.title ?? 'Opening'}
                      </p>
                      <label className="mt-2 block">
                        <span className="sr-only">Move {a.name} to stage</span>
                        <select
                          value={stages[a.id] ?? 'Applied'}
                          onChange={(e) => moveTo(a.id, e.target.value as PipelineStage)}
                          className="h-8 w-full rounded-lg border border-[var(--ds-border)] bg-white px-2 text-[12px] text-[var(--ds-text-secondary)]"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  ))}
                  {inStage.length === 0 ? (
                    <li className="rounded-[14px] border border-dashed border-[var(--ds-border-hover)] px-3 py-6 text-center text-[12px] text-[var(--ds-text-subtle)]">
                      No candidates in {stage.toLowerCase()}
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
