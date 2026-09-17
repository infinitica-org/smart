import { describe, expect, it } from 'vitest';
import {
  EMPTY_JOB_POSTING_FORM,
  JOB_POSTING_STEPS,
  buildCreateOpeningPayload,
  isCreateOpeningPayload,
} from './job-posting';

describe('job posting payload', () => {
  it('exposes seven wizard steps without job-details or eligibility steps', () => {
    expect(JOB_POSTING_STEPS.map((step) => step.id)).toEqual([
      'company-role',
      'about-company',
      'role-details',
      'requirements',
      'hiring-process',
      'drive-details',
      'review',
    ]);
  });

  it('builds the create-opening payload including logo storage key and attachments', () => {
    const parsed = buildCreateOpeningPayload(
      {
        ...EMPTY_JOB_POSTING_FORM,
        companyName: 'Infinitica Labs',
        roleTitle: 'Backend Engineer',
        location: 'Coimbatore',
        minYearsExperience: '2',
        maxYearsExperience: '5',
        aboutCompany: 'About copy',
        driveSpoc: 'tpo@campus.edu',
      },
      new Map([['ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION', 'ADVANCED']]),
      [
        {
          documentId: '33333333-3333-4333-8333-333333333333',
          fileName: 'jd.pdf',
          fileUrl: 'job-opening-docs/inst/jd.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1024,
        },
      ],
      {
        storageKey: 'job-opening-logos/inst/logo.png',
        previewUrl: 'https://signed.example/logo.png',
        fileName: 'logo.png',
      },
    );

    expect(isCreateOpeningPayload(parsed)).toBe(true);
    if (!isCreateOpeningPayload(parsed)) return;
    expect(parsed.data).toMatchObject({
      companyLogoStorageKey: 'job-opening-logos/inst/logo.png',
      attachedDocuments: [expect.objectContaining({ fileName: 'jd.pdf' })],
    });
    expect('companyLogoUrl' in parsed.data).toBe(false);
  });

  it('rejects an inverted experience range with the shared contract', () => {
    const parsed = buildCreateOpeningPayload(
      {
        ...EMPTY_JOB_POSTING_FORM,
        companyName: 'Infinitica Labs',
        roleTitle: 'Backend Engineer',
        location: 'Coimbatore',
        minYearsExperience: '6',
        maxYearsExperience: '2',
      },
      new Map([['ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION', 'BEGINNER']]),
      [],
      null,
    );

    expect(parsed.success).toBe(false);
  });
});
