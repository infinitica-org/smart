import { describe, expect, it } from 'vitest';

import { canAddResume, normalizeResumeFiles } from '@/lib/resume-list';

const sampleFile = {
  fileName: 'cv.pdf',
  objectKey: 'resumes/u1/cv.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 1024,
  uploadedAt: '2026-09-12T10:00:00.000Z',
};

describe('resume-list', () => {
  it('normalizes legacy single resume responses', () => {
    expect(normalizeResumeFiles({ resumeFile: sampleFile, resumeFiles: [] })).toEqual([sampleFile]);
  });

  it('prefers resumeFiles when present', () => {
    expect(
      normalizeResumeFiles({
        resumeFile: null,
        resumeFiles: [sampleFile, { ...sampleFile, fileName: 'old.pdf' }],
      }),
    ).toHaveLength(2);
  });

  it('enforces max five uploads on the client', () => {
    const files = Array.from({ length: 5 }, (_, index) => ({
      ...sampleFile,
      objectKey: `k-${index}`,
    }));
    expect(canAddResume(files)).toBe(false);
    expect(canAddResume(files.slice(0, 4))).toBe(true);
  });
});
