'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { REVIEW_RESPONSE_MAX_LENGTH, type CompanyReview } from '@smart/contracts';
import { EmptyState, ErrorState, FormMessage, LoadingState } from '@smart/ui';
import { api } from '@/lib/api';
import { createKeyTracker, fieldErrorsFromError } from '@/lib/company-profile-form';
import { Badge, Modal, PageHeader } from '../../../components/ui';
import { card, pageStack, primaryButton, secondaryButton, textarea } from '../../../lib/ui';

export const COMPANY_REVIEWS_QUERY_KEY = ['employer', 'reviews'] as const;

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const reviewsQuery = useQuery({
    queryKey: COMPANY_REVIEWS_QUERY_KEY,
    queryFn: () => api.employer.listReviews(),
    retry: false,
  });

  const [editing, setEditing] = useState<CompanyReview | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();
  const keys = useRef(createKeyTracker());

  const respond = useMutation({
    mutationFn: (review: CompanyReview) =>
      api.employer.respondToReview(
        review.id,
        { body: draft.trim() },
        keys.current.keyFor(`${review.id}:${draft.trim()}`),
      ),
    onSuccess: async () => {
      keys.current.reset();
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: COMPANY_REVIEWS_QUERY_KEY });
    },
    onError: (err) => {
      const fields = fieldErrorsFromError(err);
      setError(
        fields?.body ??
          (isSmartApiError(err) && err.message ? err.message : 'Could not save the response.'),
      );
    },
  });

  const reviews = reviewsQuery.data?.reviews ?? [];

  function open(review: CompanyReview) {
    setDraft(review.response?.body ?? '');
    setError(undefined);
    respond.reset();
    setEditing(review);
  }

  return (
    <div className={pageStack}>
      <PageHeader
        title="Reviews & Candidate Feedback"
        description="Public feedback from applicants and verified interns. You can respond where the review allows it."
      />

      {reviewsQuery.isPending ? (
        <LoadingState message="Loading reviews…" />
      ) : reviewsQuery.isError ? (
        <ErrorState
          title="Could not load reviews"
          message="Check your connection and try again."
          onRetry={() => void reviewsQuery.refetch()}
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Verified interns and interviewees will be able to leave company experience feedback here."
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className={`${card} space-y-3`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex" role="img" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${
                        i < review.rating
                          ? 'fill-[var(--co-amber)] text-[var(--co-amber)]'
                          : 'text-[var(--ds-border-hover)]'
                      }`}
                      aria-hidden
                    />
                  ))}
                </span>
                <span className="text-[13px] font-semibold">{review.authorLabel}</span>
                {review.response ? <Badge tone="green">Responded</Badge> : null}
              </div>
              <p className="max-w-2xl text-sm leading-relaxed">{review.body}</p>

              {review.response ? (
                <blockquote className="border-l-2 border-[var(--ds-border)] pl-3 text-sm">
                  <p className="text-xs font-semibold text-[var(--ds-text-muted)]">Your response</p>
                  <p className="whitespace-pre-line">{review.response.body}</p>
                </blockquote>
              ) : null}

              {review.responsePermitted ? (
                <button type="button" className={secondaryButton} onClick={() => open(review)}>
                  {review.response ? 'Edit response' : 'Respond'}
                </button>
              ) : (
                <p className="text-xs text-[var(--ds-text-muted)]">
                  The reviewer has not allowed company responses to this review.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        title={editing?.response ? 'Edit response' : 'Respond to review'}
        onClose={() => setEditing(null)}
      >
        <form
          className="space-y-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!editing) return;
            const text = draft.trim();
            if (!text) return setError('Write a response before saving.');
            if (text.length > REVIEW_RESPONSE_MAX_LENGTH) {
              return setError(
                `A response can be at most ${REVIEW_RESPONSE_MAX_LENGTH} characters.`,
              );
            }
            setError(undefined);
            respond.mutate(editing);
          }}
        >
          <label htmlFor="review-response" className="sr-only">
            Response
          </label>
          <textarea
            id="review-response"
            rows={5}
            className={textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-between text-xs text-[var(--ds-text-muted)]">
            <FormMessage error={error} />
            <span>
              {draft.length}/{REVIEW_RESPONSE_MAX_LENGTH}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryButton} onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" className={primaryButton} disabled={respond.isPending}>
              {respond.isPending ? 'Saving…' : 'Save response'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
