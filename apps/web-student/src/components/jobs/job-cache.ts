import type { StudentJobCard } from '@smart/contracts';

/** Every Jobs-page query lives under this key, so one call can snapshot or refresh them all. */
export const STUDENT_JOBS_KEY = ['student-jobs'] as const;
export const savedJobsKey = [...STUDENT_JOBS_KEY, 'saved'] as const;
export const jobDetailKey = (jobId: string) => [...STUDENT_JOBS_KEY, 'detail', jobId] as const;

type Patch = (job: StudentJobCard) => StudentJobCard | null;

interface Paged {
  pages: { jobs: StudentJobCard[] }[];
}
interface Flat {
  jobs: StudentJobCard[];
}

function isPaged(value: unknown): value is Paged {
  return typeof value === 'object' && value !== null && Array.isArray((value as Paged).pages);
}
function isFlat(value: unknown): value is Flat {
  return typeof value === 'object' && value !== null && Array.isArray((value as Flat).jobs);
}

function apply(jobs: StudentJobCard[], jobId: string, patch: Patch): StudentJobCard[] {
  return jobs.flatMap((job) => {
    if (job.id !== jobId) return [job];
    const next = patch(job);
    return next ? [next] : [];
  });
}

/**
 * Applies `patch` to one job inside a cached list (infinite pages or a flat saved list). Returning
 * null from `patch` removes the job. Anything else (a detail record, undefined) is left untouched.
 */
export function patchCachedJob(data: unknown, jobId: string, patch: Patch): unknown {
  if (isPaged(data)) {
    return {
      ...data,
      pages: data.pages.map((page) => ({ ...page, jobs: apply(page.jobs, jobId, patch) })),
    };
  }
  if (isFlat(data)) return { ...data, jobs: apply(data.jobs, jobId, patch) };
  return data;
}
