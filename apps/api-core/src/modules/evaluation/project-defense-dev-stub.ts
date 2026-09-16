import type { ProjectDefenseContext, ProjectDefenseSessionDto } from '@smart/contracts';
import {
  candidateDeniedProjectOwnership,
  resolveInterviewFinalTurn,
} from './project-defense-interview-policy.js';

type ExaminerTurn = {
  question: string;
  probes: 'SKILLS_APPLICATION' | 'DEPTH' | 'OWNERSHIP' | 'TRADEOFFS' | 'FAILURE_MODES' | 'CLOSING';
  isFinalTurn: boolean;
};

type GraderOutput = {
  dimensions: {
    depthOfUnderstanding: number;
    ownershipAndOriginality: number;
    defenseQuality: number;
  };
  ownershipConcern: boolean;
  ownershipConcernReason: string | null;
  justification: string;
  evidence: string[];
};

function stackSkills(stack: string): string[] {
  return stack
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function lastCandidateText(turns: ProjectDefenseSessionDto['turns']): string {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i]?.role === 'CANDIDATE') return turns[i]!.text;
  }
  return '';
}

function skillsQuestion(context: ProjectDefenseContext, candidateTurns: number): string {
  const skills = stackSkills(context.stack);
  const skill = skills[(candidateTurns - 1) % Math.max(skills.length, 1)] ?? 'your stack';
  const templates = [
    `In ${context.projectTitle}, where exactly did you use ${skill}? Walk me through that part of the code.`,
    `You listed ${skill} — show me one place in this project where you applied it, not just imported it.`,
    `How did ${skill} show up in the implementation of ${context.projectTitle}? Be specific.`,
    `What would break in ${context.projectTitle} if you removed ${skill} from the stack?`,
  ];
  return templates[(candidateTurns - 1) % templates.length]!;
}

/** Project-specific opening when transcript is empty (local dev / no LLM). */
export function stubOpeningQuestion(context: ProjectDefenseContext): ExaminerTurn {
  const skills = stackSkills(context.stack);
  const skill = skills[0] ?? 'your declared stack';
  const problemLine =
    context.projectSummary
      .split('\n')
      .find((line) => line.startsWith('Problem:'))
      ?.replace(/^Problem:\s*/, '')
      .trim() ?? context.projectSummary.slice(0, 120);

  return {
    question: `Starting with "${context.projectTitle}" — ${problemLine.slice(0, 140)} — what did you personally build, and where did you apply ${skill}?`,
    probes: 'SKILLS_APPLICATION',
    isFinalTurn: false,
  };
}

/** Deterministic examiner when no LLM provider is configured (local dev only). */
export function stubExaminerTurn(
  session: {
    context: ProjectDefenseContext;
    turns: ProjectDefenseSessionDto['turns'];
    candidateTurnsSubmitted?: number;
  },
  secondsRemaining: number,
): ExaminerTurn {
  const last = lastCandidateText(session.turns);
  const candidateTurns =
    session.candidateTurnsSubmitted ?? session.turns.filter((t) => t.role === 'CANDIDATE').length;
  const closingSoon = secondsRemaining <= 60;

  if (candidateDeniedProjectOwnership(last)) {
    return {
      question:
        'You said you did not build this — what was your actual role, and which parts did you write?',
      probes: 'OWNERSHIP',
      isFinalTurn: resolveInterviewFinalTurn({
        candidateTurnsSubmitted: candidateTurns,
        examinerWantsFinal: true,
        secondsRemaining,
        lastCandidateText: last,
      }),
    };
  }

  const snippet = last.split(/\s+/).slice(0, 8).join(' ');
  const prefix = snippet ? `You mentioned "${snippet}…" — ` : '';

  if (closingSoon) {
    return {
      question: `${prefix}Last question: which skill from your stack was hardest to apply in this project, and why?`,
      probes: 'CLOSING',
      isFinalTurn: resolveInterviewFinalTurn({
        candidateTurnsSubmitted: candidateTurns,
        examinerWantsFinal: true,
        secondsRemaining,
        lastCandidateText: last,
      }),
    };
  }

  if (candidateTurns <= 2) {
    return {
      question: `${prefix}${skillsQuestion(session.context, candidateTurns)}`.slice(0, 1_000),
      probes: 'SKILLS_APPLICATION',
      isFinalTurn: false,
    };
  }

  const depthFollowUps = [
    'What trade-off did you accept in this project that you would revisit today?',
    'What broke or surprised you during development, and how did you fix it?',
    'Which part of the codebase would you refactor first if you had another week?',
  ];
  const followUp = depthFollowUps[(candidateTurns - 3) % depthFollowUps.length]!;

  return {
    question: `${prefix}${followUp}`.slice(0, 1_000),
    probes: candidateTurns % 2 === 0 ? 'DEPTH' : 'TRADEOFFS',
    isFinalTurn: false,
  };
}

/** Deterministic grader when no LLM provider is configured (local dev only). */
export function stubGraderOutput(session: {
  context: ProjectDefenseContext;
  turns: ProjectDefenseSessionDto['turns'];
}): GraderOutput {
  const candidateText = session.turns
    .filter((t) => t.role === 'CANDIDATE')
    .map((t) => t.text)
    .join(' ');
  const denied = candidateDeniedProjectOwnership(candidateText);
  const depth = denied ? 35 : 72;
  const ownership = denied ? 30 : 78;
  const defense = denied ? 40 : 74;

  return {
    dimensions: {
      depthOfUnderstanding: depth,
      ownershipAndOriginality: ownership,
      defenseQuality: defense,
    },
    ownershipConcern: denied || session.context.verifyFlags.length > 0,
    ownershipConcernReason: denied
      ? 'Candidate stated they did not build the project during the voice interview.'
      : session.context.verifyFlags.length > 0
        ? 'Automated verification flagged gaps that require human review.'
        : null,
    justification: denied
      ? 'Local dev stub: ownership denial detected in transcript.'
      : 'Local dev stub: transcript shows plausible project ownership for demo purposes.',
    evidence: denied ? ['Candidate denied building the project in their own words.'] : [],
  };
}
