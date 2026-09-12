import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeSection } from './ResumeSection';

const getResume = vi.fn();
const uploadResume = vi.fn();
const parseResume = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      getResume: () => getResume(),
      uploadResume: (...args: unknown[]) => uploadResume(...args),
      parseResume: (...args: unknown[]) => parseResume(...args),
    },
  },
}));

vi.mock('@/lib/extract-resume-text', () => ({
  extractResumeRawText: vi.fn().mockResolvedValue('a'.repeat(80)),
}));

describe('ResumeSection', () => {
  beforeEach(() => {
    getResume.mockReset();
    uploadResume.mockReset();
    parseResume.mockReset();
    getResume.mockResolvedValue({ resumeFile: null });
    uploadResume.mockResolvedValue({
      resumeFile: {
        fileName: 'resume.pdf',
        objectKey: 'resumes/user/resume.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1200,
        uploadedAt: '2026-09-12T10:00:00.000Z',
      },
    });
    parseResume.mockResolvedValue({ status: 'PARSED', draft: { parseConfidence: 0.8 } });
  });

  it('uploads and parses a resume from profile', async () => {
    render(<ResumeSection />);
    expect(await screen.findByText('No resume uploaded yet.')).toBeDefined();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(
      ['resume text content here that is long enough for parse'],
      'resume.pdf',
      {
        type: 'application/pdf',
      },
    );
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadResume).toHaveBeenCalled();
      expect(parseResume).toHaveBeenCalled();
      expect(screen.getByText('resume.pdf')).toBeDefined();
    });
  });
});
