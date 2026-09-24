import { UnprocessableEntityException } from '@nestjs/common';
import type { ZodError } from 'zod';

export type SubmitSection = 'representative' | 'profile' | 'verification';

type SectionResult = { success: true } | { success: false; error: ZodError };

const SECTION_LABEL: Record<SubmitSection, string> = {
  representative: 'your contact details',
  profile: 'your company profile',
  verification: 'your verification details',
};

/** "Invalid input: expected string, received undefined" is noise to a user; say what it means. */
function friendlyMessage(issue: { code: string; message: string }): string {
  if (issue.code === 'invalid_type' && /received undefined/i.test(issue.message)) {
    return 'This field is required.';
  }
  return issue.message;
}

/**
 * Turns the failed sections of a saved onboarding draft into one 422 with a message a person can act
 * on, plus the exact missing fields. Without this, a Zod error escapes as "Request failed validation."
 */
export function incompleteSubmissionError(input: {
  results: Record<SubmitSection, SectionResult>;
  hasVerificationData: boolean;
}): UnprocessableEntityException {
  const details: { path: string; message: string }[] = [];
  const failed: SubmitSection[] = [];

  for (const section of ['representative', 'profile', 'verification'] as const) {
    const result = input.results[section];
    if (result.success) continue;
    failed.push(section);
    for (const issue of result.error.issues) {
      details.push({
        path: [section, ...issue.path.map(String)].join('.'),
        message: friendlyMessage(issue),
      });
    }
  }

  const message = !input.hasVerificationData
    ? 'Add your verification details (registered address and business registration information) before submitting.'
    : `Complete ${failed.map((section) => SECTION_LABEL[section]).join(' and ')} before submitting.`;

  return new UnprocessableEntityException({
    error: 'validation_failed',
    message,
    statusCode: 422,
    details,
  });
}
