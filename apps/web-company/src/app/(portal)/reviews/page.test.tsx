import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewsPage from './page';

const employer = vi.hoisted(() => ({ listReviews: vi.fn(), respondToReview: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { employer } }));

const review = (over: Record<string, unknown> = {}) => ({
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  rating: 4,
  body: 'Great interview process.',
  authorLabel: 'Verified intern',
  createdAt: '2026-09-10T00:00:00.000Z',
  responsePermitted: true,
  response: null,
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReviewsPage />
    </QueryClientProvider>,
  );
}

describe('Reviews page (Th6-355)', () => {
  beforeEach(() => {
    employer.listReviews.mockReset();
    employer.respondToReview.mockReset();
  });
  afterEach(cleanup);

  it('shows loading, empty and error states', async () => {
    employer.listReviews.mockResolvedValueOnce({ reviews: [] });
    renderPage();
    expect(screen.getByText('Loading reviews…')).toBeTruthy();
    expect(await screen.findByText('No reviews yet')).toBeTruthy();
    cleanup();

    employer.listReviews.mockRejectedValueOnce(new Error('down'));
    renderPage();
    expect(await screen.findByText('Could not load reviews')).toBeTruthy();
    employer.listReviews.mockResolvedValue({ reviews: [review()] });
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(await screen.findByText('Great interview process.')).toBeTruthy();
  });

  it('only offers Respond when the review permits it', async () => {
    employer.listReviews.mockResolvedValue({
      reviews: [
        review(),
        review({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', responsePermitted: false }),
      ],
    });
    renderPage();
    await screen.findAllByText('Great interview process.');
    expect(screen.getAllByRole('button', { name: 'Respond' })).toHaveLength(1);
    expect(screen.getByText(/has not allowed company responses/)).toBeTruthy();
  });

  it('saves a response with an Idempotency-Key and refreshes', async () => {
    employer.listReviews.mockResolvedValue({ reviews: [review()] });
    employer.respondToReview.mockResolvedValue(review());
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Respond' }));
    fireEvent.change(screen.getByLabelText('Response'), { target: { value: 'Thank you!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }));
    await waitFor(() => expect(employer.respondToReview).toHaveBeenCalledTimes(1));
    const [id, body, key] = employer.respondToReview.mock.calls[0] ?? [];
    expect([id, body]).toEqual([review().id, { body: 'Thank you!' }]);
    expect(typeof key).toBe('string');
    await waitFor(() => expect(employer.listReviews).toHaveBeenCalledTimes(2));
  });

  it('blocks an empty or over-1000-character response before calling the API', async () => {
    employer.listReviews.mockResolvedValue({ reviews: [review()] });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Respond' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }));
    expect(await screen.findByText('Write a response before saving.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Response'), { target: { value: 'a'.repeat(1001) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save response' }));
    expect(await screen.findByText(/at most 1000 characters/)).toBeTruthy();
    expect(employer.respondToReview).not.toHaveBeenCalled();
  });

  it('shows an existing response and lets the owner edit it', async () => {
    employer.listReviews.mockResolvedValue({
      reviews: [review({ response: { body: 'Old reply', updatedAt: '2026-09-11T00:00:00.000Z' } })],
    });
    renderPage();
    expect(await screen.findByText('Old reply')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit response' }));
    expect((screen.getByLabelText('Response') as HTMLTextAreaElement).value).toBe('Old reply');
  });
});
