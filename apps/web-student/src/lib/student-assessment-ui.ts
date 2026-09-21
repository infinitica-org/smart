import type { SkillClaimDto } from '@smart/contracts';

import {
  isProjectTaggedSkillClaim,
  SKILL_PROFICIENCY_DISCOVERY_COPY,
} from './skill-claim-origin-ui';
import { repositoryStatusForClaim, viewForFocus } from './skill-declarations';

export type AssessmentCardAction = 'start' | 'continue' | 'locked' | 'verified';

export function assessmentCardStateForClaim(claim: SkillClaimDto): {
  statusLabel: string;
  action: AssessmentCardAction;
  buttonLabel: string;
  disabled: boolean;
} {
  const { displayLabel } = repositoryStatusForClaim(claim);
  const view = viewForFocus(claim, claim.skillCode, claim.skillFocus ?? undefined);

  if (claim.status === 'LOCKED' || view.cooling) {
    return {
      statusLabel: displayLabel === 'Locked' ? 'Locked' : displayLabel,
      action: 'locked',
      buttonLabel: 'Locked',
      disabled: true,
    };
  }

  if (claim.status === 'VERIFIED') {
    return {
      statusLabel: 'Verified',
      action: 'verified',
      buttonLabel: '',
      disabled: true,
    };
  }

  const inProgress =
    Boolean(claim.lastAttemptId) &&
    (claim.status === 'DECLARED' || claim.status === 'BEGINNER_REATTEMPT');

  if (inProgress) {
    return {
      statusLabel: 'In progress',
      action: 'continue',
      buttonLabel: 'Continue Assessment',
      disabled: false,
    };
  }

  if (isProjectTaggedSkillClaim(claim)) {
    return {
      statusLabel: SKILL_PROFICIENCY_DISCOVERY_COPY,
      action: 'start',
      buttonLabel: 'Start Assessment',
      disabled: !view.canStart && !view.hasForm,
    };
  }

  return {
    statusLabel: displayLabel === 'Declared' ? 'Not started' : displayLabel,
    action: 'start',
    buttonLabel: 'Start Assessment',
    disabled: !view.canStart && !view.hasForm,
  };
}
