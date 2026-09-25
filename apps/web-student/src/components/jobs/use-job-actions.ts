'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { isSmartApiError } from '@smart/api-client';
import type { StudentJobCard, StudentJobDetail } from '@smart/contracts';
import { api } from '@/lib/api';
import { STUDENT_JOBS_KEY, jobDetailKey, patchCachedJob, savedJobsKey } from './job-cache';

type Snapshot = [QueryKey, unknown][];

export interface HiddenJobNotice {
  jobId: string;
  title: string;
}

function messageOf(error: unknown, fallback: string): string {
  return isSmartApiError(error) && error.message ? error.message : fallback;
}

/**
 * Save / hide / undo with optimistic updates (Th6-384/385): the cache changes first so the UI feels
 * instant, and every list is restored exactly if the server says no.
 */
export function useJobActions(onHidden?: (notice: HiddenJobNotice) => void) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const snapshot = (): Snapshot => queryClient.getQueriesData({ queryKey: STUDENT_JOBS_KEY });
  const restore = (saved: Snapshot | undefined) => {
    saved?.forEach(([key, data]) => queryClient.setQueryData(key, data));
  };
  const patchEverywhere = (
    jobId: string,
    patch: (job: StudentJobCard) => StudentJobCard | null,
  ) => {
    queryClient.setQueriesData({ queryKey: STUDENT_JOBS_KEY }, (data) =>
      patchCachedJob(data, jobId, patch),
    );
  };

  const save = useMutation({
    mutationFn: ({ job, saved }: { job: Pick<StudentJobCard, 'id'>; saved: boolean }) =>
      saved ? api.studentJobs.save(job.id) : api.studentJobs.unsave(job.id),
    onMutate: async ({ job, saved }) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey: STUDENT_JOBS_KEY });
      const before = snapshot();
      patchEverywhere(job.id, (current) => ({ ...current, saved }));
      queryClient.setQueryData<StudentJobDetail>(jobDetailKey(job.id), (detail) =>
        detail ? { ...detail, saved } : detail,
      );
      return { before };
    },
    onError: (err, _vars, context) => {
      restore(context?.before);
      setError(messageOf(err, 'Could not update your saved jobs. Please try again.'));
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: savedJobsKey }),
  });

  const hide = useMutation({
    mutationFn: ({
      job,
      reason,
    }: {
      job: Pick<StudentJobCard, 'id' | 'roleTitle'>;
      reason?: string;
    }) => api.studentJobs.hide(job.id, reason ? { reason } : {}),
    onMutate: async ({ job }) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey: STUDENT_JOBS_KEY });
      const before = snapshot();
      patchEverywhere(job.id, () => null);
      return { before };
    },
    onSuccess: (_result, { job }) => onHidden?.({ jobId: job.id, title: job.roleTitle }),
    onError: (err, _vars, context) => {
      restore(context?.before);
      setError(messageOf(err, 'Could not hide this job. Please try again.'));
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: STUDENT_JOBS_KEY }),
  });

  const undoHide = useMutation({
    mutationFn: (jobId: string) => api.studentJobs.unhide(jobId),
    onError: (err) => setError(messageOf(err, 'Could not undo. Please try again.')),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: STUDENT_JOBS_KEY }),
  });

  return {
    error,
    clearError: () => setError(null),
    toggleSave: (job: Pick<StudentJobCard, 'id'>, saved: boolean) => save.mutate({ job, saved }),
    hide: (job: Pick<StudentJobCard, 'id' | 'roleTitle'>, reason?: string) =>
      hide.mutate({ job, reason }),
    undoHide: (jobId: string) => undoHide.mutate(jobId),
  };
}
