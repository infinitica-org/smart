import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewCompanyDialog } from './ReviewCompanyDialog';

const createReview = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { companies: { createReview: (...args: unknown[]) => createReview(...args) } },
}));

const COMPANY = '11111111-1111-4111-8111-111111111111';

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ReviewCompanyDialog open onClose={onClose} companyId={COMPANY} companyName="Acme" />
    </QueryClientProvider>,
  );
  return onClose;
}

function fill(rating: number, text: string) {
  fireEvent.click(screen.getByRole('button', { name: `${rating} stars` }));
  fireEvent.change(screen.getByLabelText('Your experience'), { target: { value: text } });
}

describe('ReviewCompanyDialog (Th6-355)', () => {
  beforeEach(() => createReview.mockReset());
  afterEach(cleanup);

  it('validates rating and length before calling the API', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    expect(await screen.findByText('Choose a rating from 1 to 5.')).toBeTruthy();
    fill(4, 'short');
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    expect(await screen.findByText('Write at least 10 characters.')).toBeTruthy();
    expect(createReview).not.toHaveBeenCalled();
  });

  it('defaults to no company response and lets the student opt in', async () => {
    createReview.mockResolvedValue({});
    renderDialog();
    fill(5, 'A thoughtful and fair process.');
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    await waitFor(() => expect(createReview).toHaveBeenCalledTimes(1));
    expect(createReview.mock.calls[0]?.[0]).toMatchObject({
      companyId: COMPANY,
      rating: 5,
      allowCompanyResponse: false,
    });
    expect(typeof createReview.mock.calls[0]?.[1]).toBe('string');
    expect(await screen.findByText('Thanks. Your review has been saved.')).toBeTruthy();
  });

  it('sends allowCompanyResponse when ticked', async () => {
    createReview.mockResolvedValue({});
    renderDialog();
    fill(3, 'Average but respectful process.');
    fireEvent.click(screen.getByLabelText(/Allow Acme to publicly respond/));
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    await waitFor(() => expect(createReview).toHaveBeenCalled());
    expect(createReview.mock.calls[0]?.[0].allowCompanyResponse).toBe(true);
  });

  it('shows the server message and reuses the Idempotency-Key on retry', async () => {
    const { SmartApiError } = await import('@smart/api-client');
    createReview.mockRejectedValueOnce(
      new SmartApiError({
        error: 'review_exists',
        message: 'You have already reviewed this company.',
        statusCode: 409,
      } as never),
    );
    renderDialog();
    fill(4, 'Good communication throughout.');
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    expect(await screen.findByText('You have already reviewed this company.')).toBeTruthy();
    createReview.mockResolvedValue({});
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    await waitFor(() => expect(createReview).toHaveBeenCalledTimes(2));
    expect(createReview.mock.calls[1]?.[1]).toBe(createReview.mock.calls[0]?.[1]);
  });
});
