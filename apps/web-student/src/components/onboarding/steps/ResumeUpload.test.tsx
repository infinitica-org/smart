import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResumeUpload from './ResumeUpload';

const parseResume = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      parseResume: (...args: unknown[]) => parseResume(...args),
    },
  },
}));

vi.mock('@/lib/extract-resume-text', () => ({
  extractResumeRawText: vi.fn(async () => 'A'.repeat(80)),
}));

describe('ResumeUpload', () => {
  beforeEach(() => {
    parseResume.mockReset();
  });

  it('calls POST /users/me/resume/parse and continues with parsed draft', async () => {
    const onContinue = vi.fn();
    parseResume.mockResolvedValueOnce({
      status: 'PARSED',
      draft: {
        basicInfo: { firstName: 'Ada', lastName: 'Lovelace' },
        education: [],
        experiences: [],
        skills: [],
        licenses: [],
        parseConfidence: 0.7,
        missingFields: [],
      },
    });

    render(<ResumeUpload onContinue={onContinue} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['resume text content here that is long enough'], 'resume.txt', {
      type: 'text/plain',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(parseResume).toHaveBeenCalledTimes(1));
    expect(parseResume).toHaveBeenCalledWith({ rawText: expect.any(String) });
    await waitFor(() => expect(screen.getByText(/Resume parsed/i)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        basicInfo: expect.objectContaining({ firstName: 'Ada' }),
      }),
    );
  });
});
