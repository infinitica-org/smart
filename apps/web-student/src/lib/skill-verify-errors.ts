import { isSmartApiError, SmartNetworkError } from '@smart/api-client';
import type { SkillVerifySessionDto } from '@smart/contracts';

export function isSkillVerifyAnswered(
  answer:
    | {
        selectedKey?: string;
        text?: string;
      }
    | undefined,
): boolean {
  if (!answer) return false;
  if (answer.selectedKey) return true;
  return Boolean(answer.text?.trim());
}

export type SkillVerifyErrorKind =
  | 'generation_failed'
  | 'network'
  | 'rate_limit'
  | 'login_required'
  | 'locked'
  | 'not_found'
  | 'forbidden'
  | 'profile_incomplete'
  | 'session_expired'
  | 'save_failed'
  | 'submit_failed'
  | 'incomplete'
  | 'unknown';

export type SkillVerifyError = {
  kind: SkillVerifyErrorKind;
  title: string;
  message: string;
  retryAfterSeconds?: number;
};

const GENERATION_FAILED: SkillVerifyError = {
  kind: 'generation_failed',
  title: 'Assessment unavailable',
  message:
    'We could not prepare your assessment right now. Wait a moment and try again from Skills.',
};

const NETWORK_ERROR: SkillVerifyError = {
  kind: 'network',
  title: 'Connection lost',
  message: 'Check your internet connection. Your progress is saved on the server when possible.',
};

const UNKNOWN_ERROR: SkillVerifyError = {
  kind: 'unknown',
  title: 'Something went wrong',
  message: 'Please try again. If this keeps happening, return to Skills and start over.',
};

function looksTechnical(message: string): boolean {
  return /api.?key|anthropic|openrouter|google.?ai|token|unconfigured|missing.*key|502|503|bad gateway/i.test(
    message,
  );
}

export function skillVerifyIncompleteError(): SkillVerifyError {
  return {
    kind: 'incomplete',
    title: 'Not ready to submit',
    message: 'Answer every question before submitting your assessment.',
  };
}

export function areAllSkillVerifyItemsAnswered(
  session: SkillVerifySessionDto,
  answers: Record<number, { selectedKey?: string; text?: string }>,
): boolean {
  return session.items.every((item) => isSkillVerifyAnswered(answers[item.index]));
}

export function skillVerifyErrorFromUnknown(
  error: unknown,
  context: 'prepare' | 'generate' | 'save' | 'submit' = 'prepare',
): SkillVerifyError {
  if (error instanceof SmartNetworkError) {
    return NETWORK_ERROR;
  }

  if (isSmartApiError(error)) {
    if (error.requiresLogin) {
      return {
        kind: 'login_required',
        title: 'Session expired',
        message: 'Sign in again to continue this verification.',
      };
    }
    if (error.statusCode === 429 || error.code === 'rate_limit_exceeded') {
      return {
        kind: 'rate_limit',
        title: 'Please wait',
        message: 'Too many requests. Try again shortly.',
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
    if (error.code === 'level_locked' || error.code === 'integrity_hold') {
      return {
        kind: 'locked',
        title: 'Verification locked',
        message: 'This skill verification is temporarily locked.',
      };
    }
    if (error.code === 'attempt_expired') {
      return {
        kind: 'session_expired',
        title: 'Time is up',
        message: 'This assessment window has closed.',
      };
    }
    if (error.code === 'profile_incomplete') {
      return {
        kind: 'profile_incomplete',
        title: 'Profile incomplete',
        message: 'Complete your profile to 100% before taking skill assessments.',
      };
    }
    if (error.statusCode === 404 || error.code === 'not_found') {
      return {
        kind: 'not_found',
        title: 'Verification not found',
        message: 'This skill verification is no longer available.',
      };
    }
    if (error.statusCode === 403 || error.code === 'forbidden') {
      return {
        kind: 'forbidden',
        title: 'Not allowed',
        message: 'You cannot access this verification right now.',
      };
    }
    if (
      error.code === 'skill_form_unavailable' ||
      error.code === 'ai_provider_unavailable' ||
      error.code === 'service_unavailable' ||
      error.statusCode === 502 ||
      error.statusCode === 503
    ) {
      return GENERATION_FAILED;
    }
    if (looksTechnical(error.message)) {
      return context === 'generate' || context === 'prepare'
        ? GENERATION_FAILED
        : {
            kind: context === 'save' ? 'save_failed' : 'submit_failed',
            title: context === 'save' ? 'Could not save' : 'Could not submit',
            message: UNKNOWN_ERROR.message,
          };
    }
    return {
      kind: 'unknown',
      title:
        context === 'generate'
          ? GENERATION_FAILED.title
          : context === 'save'
            ? 'Could not save'
            : context === 'submit'
              ? 'Could not submit'
              : 'Could not start',
      message: error.message,
    };
  }

  if (error instanceof Error && looksTechnical(error.message)) {
    return context === 'generate' || context === 'prepare' ? GENERATION_FAILED : UNKNOWN_ERROR;
  }

  return {
    ...UNKNOWN_ERROR,
    title:
      context === 'generate'
        ? GENERATION_FAILED.title
        : context === 'save'
          ? 'Could not save'
          : context === 'submit'
            ? 'Could not submit'
            : 'Could not start',
  };
}
