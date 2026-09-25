'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type {
  ApplicationStatus,
  EmployerApplicantCard,
  ListEmployerApplicantsResponse,
} from '@smart/contracts';
import { api } from '@/lib/api';
import { describeMoveFailure, moveApplicant, type MoveFailure } from '@/lib/pipeline-board';

interface InfiniteApplicants {
  pages: ListEmployerApplicantsResponse[];
  pageParams: unknown[];
}

function mapApplicants(
  data: InfiniteApplicants | undefined,
  fn: (list: EmployerApplicantCard[]) => EmployerApplicantCard[],
): InfiniteApplicants | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, applicants: fn(page.applicants) })),
  };
}

/**
 * Moves a candidate (Th6-414) with an optimistic update. If the server answers 409 (someone else moved
 * it) or 422 (not allowed) the card snaps back and the reason is shown; a 409 also refreshes the board.
 */
export function useApplicantMoves(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<MoveFailure | null>(null);
  // The same move, retried, reuses its key so the server can never apply it twice.
  const keys = useRef(new Map<string, string>());

  const mutation = useMutation({
    mutationFn: ({
      applicant,
      to,
    }: {
      applicant: EmployerApplicantCard;
      to: ApplicationStatus;
    }) => {
      const fingerprint = `${applicant.applicationId}:${applicant.status}:${to}`;
      let key = keys.current.get(fingerprint);
      if (!key) {
        key = crypto.randomUUID();
        keys.current.set(fingerprint, key);
      }
      return api.employer.transitionApplication(
        applicant.applicationId,
        { toStatus: to, expectedFromStatus: applicant.status },
        key,
      );
    },
    onMutate: async ({ applicant, to }) => {
      setNotice(null);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InfiniteApplicants>(queryKey);
      queryClient.setQueryData<InfiniteApplicants>(queryKey, (data) =>
        mapApplicants(data, (list) => moveApplicant(list, applicant.applicationId, to)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      const failure = describeMoveFailure(error);
      setNotice(failure);
      if (failure.kind === 'conflict') void queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: (_result, { applicant, to }) => {
      keys.current.delete(`${applicant.applicationId}:${applicant.status}:${to}`);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

  return {
    notice,
    dismissNotice: () => setNotice(null),
    move: (applicant: EmployerApplicantCard, to: ApplicationStatus) =>
      mutation.mutate({ applicant, to }),
    isMoving: mutation.isPending,
  };
}
