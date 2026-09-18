import { PROJECT_DEFENSE_MIN_CANDIDATE_TURNS } from '@smart/contracts';

/** True only when the candidate denies building the project — not casual "I didn't make X feature". */
export function candidateDeniedProjectOwnership(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(not|wasn't|was not)\s+(my|our)\s+project\b/.test(lower) ||
    /\bdidn'?t\s+(build|create|write|develop|work on)\s+(this(\s+(project|app|application))?|the project)\b/.test(
      lower,
    ) ||
    /\bdid not\s+(build|create|write|develop|work on)\s+(this(\s+(project|app|application))?|the project)\b/.test(
      lower,
    ) ||
    /\bdidn'?t\s+do\s+this\s+project\b/.test(lower) ||
    /\bdid not\s+do\s+this\s+project\b/.test(lower) ||
    /\bno\s+i\s+didn'?t\s+do\s+this\s+project\b/.test(lower) ||
    /\bnot my (work|code|implementation)\b/.test(lower)
  );
}

export function resolveInterviewFinalTurn(input: {
  candidateTurnsSubmitted: number;
  examinerWantsFinal: boolean;
  secondsRemaining: number;
  lastCandidateText: string;
}): boolean {
  if (input.secondsRemaining <= 0) return true;
  if (candidateDeniedProjectOwnership(input.lastCandidateText)) {
    return input.examinerWantsFinal;
  }
  if (input.candidateTurnsSubmitted < PROJECT_DEFENSE_MIN_CANDIDATE_TURNS) {
    return false;
  }
  return input.examinerWantsFinal;
}
