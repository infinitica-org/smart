'use client';

import { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Badge, PageHeader } from '../../../components/ui';
import type { Review } from '../../../lib/types';
import { card, pageStack, secondaryButton } from '../../../lib/ui';

export default function ReviewsPage() {
  const [reviews] = useState<Review[]>([]);

  return (
    <div className={pageStack}>
      <PageHeader
        title="Reviews & Candidate Feedback"
        description="Public feedback and experience ratings left by applicants and verified interns."
      />

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-[var(--ds-border)] bg-white p-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 mb-3">
            <Star className="size-6" />
          </div>
          <h2 className="text-base font-semibold text-[var(--ds-text)]">No reviews yet</h2>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--ds-text-muted)]">
            Verified interns and interviewees who complete recruitment defense rounds will be able
            to leave company experience feedback here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className={`${card} flex flex-wrap items-start justify-between gap-4`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="flex" role="img" aria-label={`${review.stars} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${
                          i < review.stars
                            ? 'fill-[var(--co-amber)] text-[var(--co-amber)]'
                            : 'text-[var(--ds-border-hover)]'
                        }`}
                        aria-hidden
                      />
                    ))}
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--ds-text)]">
                    {review.author}
                  </span>
                  <Badge tone={review.status === 'Published' ? 'green' : 'amber'}>
                    {review.status}
                  </Badge>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                  {review.text}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={secondaryButton}>
                  Respond
                </button>
                <button type="button" className={secondaryButton}>
                  Report
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
