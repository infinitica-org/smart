'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Send, Users, PlusCircle, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { StatCard } from '../../components/stat-card';
import { companyJobsApi } from '../../lib/api';
import { getCurrentUser } from '../../lib/auth';
import type { JobOpeningDto } from '@smart/contracts';
import {
  card,
  pageStack,
  primaryButton,
  secondaryButton,
  sectionSubtitle,
  sectionTitle,
} from '../../lib/ui';

export default function HomePage() {
  const [jobs, setJobs] = useState<JobOpeningDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('Employer');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [me, openingsRes] = await Promise.allSettled([
          getCurrentUser(),
          companyJobsApi.list().catch(() => ({ openings: [] })),
        ]);

        if (me.status === 'fulfilled' && me.value?.email) {
          const domain = me.value.email.split('@')[1]?.split('.')[0];
          setCompanyName(domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : 'Employer');
        }

        if (openingsRes.status === 'fulfilled' && openingsRes.value?.openings) {
          setJobs(openingsRes.value.openings);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard().catch(() => {});
  }, []);

  const activeJobs = jobs.filter((job) => job.status === 'OPEN').length;

  return (
    <div className={pageStack}>
      <PageHeader
        title={`${companyName} — Recruiting Console`}
        description="Post verified jobs, discover assessed candidates, and track active applications."
        actions={
          <>
            <Link href="/jobs/new" className={primaryButton}>
              <PlusCircle className="size-4" />
              Post a job
            </Link>
            <Link href="/students" className={secondaryButton}>
              <Search className="size-4" />
              Search candidates
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active jobs"
          value={loading ? '—' : activeJobs}
          icon={Briefcase}
          accent="blue"
        />
        <StatCard
          label="Total postings"
          value={loading ? '—' : jobs.length}
          icon={Users}
          accent="mint"
        />
        <StatCard
          label="Direct inquiries"
          value={loading ? '—' : 0}
          icon={Send}
          accent="lavender"
        />
      </div>

      <section className={card}>
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h2 className={sectionTitle}>Active Openings & Pipeline</h2>
            <p className={sectionSubtitle}>Live roles currently receiving candidate submissions</p>
          </div>
          <Link
            href="/jobs"
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
          >
            View all jobs →
          </Link>
        </div>

        {jobs.length === 0 && !loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              <Briefcase className="size-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900">No active job postings</h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
              Create your first role to start matching with verified students and qualified
              candidates.
            </p>
            <div className="mt-4">
              <Link href="/jobs/new" className={primaryButton}>
                + Post your first job
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {jobs.slice(0, 5).map((job) => (
              <li key={job.openingId} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold text-zinc-900">{job.roleTitle}</p>
                  <p className="text-xs text-zinc-500">
                    {job.location ?? 'Remote'} · {job.employmentType ?? 'Full-time'}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  {job.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
