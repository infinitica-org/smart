'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { CreateCompanyReviewRequestSchema } from '@smart/contracts';
import { Button, FormMessage, Modal } from '@smart/ui';
import { api } from '@/lib/api';

interface ReviewCompanyDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

/** Th6-355 — a student reviews a company they applied to and chooses whether it may respond. */
export function ReviewCompanyDialog({
  open,
  onClose,
  companyId,
  companyName,
}: ReviewCompanyDialogProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [allowResponse, setAllowResponse] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  // Same payload => same key, so a retry after a dropped connection never posts twice.
  const keyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const submit = useMutation({
    mutationFn: (body: ReturnType<typeof CreateCompanyReviewRequestSchema.parse>) => {
      const fingerprint = JSON.stringify(body);
      if (keyRef.current?.fingerprint !== fingerprint) {
        keyRef.current = { fingerprint, key: crypto.randomUUID() };
      }
      return api.companies.createReview(body, keyRef.current.key);
    },
    onSuccess: () => setDone(true),
    onError: (err) => {
      const detail = isSmartApiError(err) ? err.details[0]?.message : undefined;
      setError(
        detail ??
          (isSmartApiError(err) && err.message ? err.message : 'Could not save your review.'),
      );
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = CreateCompanyReviewRequestSchema.safeParse({
      companyId,
      rating,
      body: text,
      allowCompanyResponse: allowResponse,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your review and try again.');
      return;
    }
    setError(undefined);
    submit.mutate(parsed.data);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Review ${companyName}`}>
      {done ? (
        <div className="space-y-3" role="status">
          <p className="text-sm">Thanks. Your review has been saved.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <fieldset>
            <legend className="text-xs font-semibold">Rating</legend>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                >
                  <Star
                    className={`size-6 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'}`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="review-text" className="text-xs font-semibold">
              Your experience
            </label>
            <textarea
              id="review-text"
              rows={5}
              className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={allowResponse}
              onChange={(e) => setAllowResponse(e.target.checked)}
            />
            Allow {companyName} to publicly respond to this review
          </label>
          <FormMessage error={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Saving…' : 'Submit review'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
