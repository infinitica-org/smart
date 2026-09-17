import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobOpeningIdLabel } from './JobOpeningIdLabel';

const jobId = '11111111-1111-4111-8111-111111111111';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('JobOpeningIdLabel', () => {
  it('shows the job id and copies to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<JobOpeningIdLabel openingId={jobId} />);
    expect(screen.getByText(jobId)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(jobId);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy();
  });
});
