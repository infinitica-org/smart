'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, PlusCircle } from 'lucide-react';
import { Badge, PageHeader } from '../../../components/ui';
import { companyJobsApi, formatApiError } from '../../../lib/api';
import type { JobOpeningDto } from '@smart/contracts';
import {
  pageStack,
  primaryButton,
  table,
  tableCell,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableShell,
} from '../../../lib/ui';

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobOpeningDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      try {
        const res = await companyJobsApi.list();
        setJobs(res.openings ?? []);
      } catch (err) {
        setError(formatApiError(err, 'Failed to load job postings.'));
        setJobs([]);
      } finally {
        setLoading(false);
      }
    }
    loadJobs().catch(() => {});
  }, []);

  return (
    <div className={pageStack}>
      <PageHeader
        title="Job Openings"
        description="Manage active roles, customize required competency criteria, and track applicants."
        actions={
          <Link href="/jobs/new" className={primaryButton}>
            <PlusCircle className="size-4" />
            Post a job
          </Link>
        }
      />

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <div className={tableShell}>
        <table className={table}>
          <thead>
            <tr className={tableHeadRow}>
              <th className={tableHeadCell}>Job Role</th>
              <th className={tableHeadCell}>Location & Mode</th>
              <th className={tableHeadCell}>Status</th>
              <th className={`${tableHeadCell} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-zinc-500">
                  Loading jobs from database...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                    <Briefcase className="size-5" />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    No job openings created yet
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Click &ldquo;Post a job&rdquo; to publish your first role.
                  </p>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.openingId} className={tableRow}>
                  <td className={`${tableCell} font-semibold text-zinc-900`}>{job.roleTitle}</td>
                  <td className={tableCell}>
                    <span className="text-xs text-zinc-600">
                      {job.location ?? 'Remote'} · {job.employmentType ?? 'Full-time'}
                    </span>
                  </td>
                  <td className={tableCell}>
                    <Badge tone={job.status === 'OPEN' ? 'green' : 'neutral'}>{job.status}</Badge>
                  </td>
                  <td className={`${tableCell} text-right`}>
                    <Link
                      href={`/jobs/${job.openingId}/edit`}
                      className="text-xs font-semibold text-zinc-900 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
