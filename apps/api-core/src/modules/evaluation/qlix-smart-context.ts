import { getSkillBlueprint, getSkillDefinition, type ProficiencyLevel } from '@smart/contracts';

export type QlixSmartContextInput = {
  projectId: string;
  studentId: string;
  title: string;
  problem: string;
  approach: string;
  stack: string;
  outcome: string;
  loomUrl?: string | null;
  liveUrl?: string | null;
  skillMappings: ReadonlyArray<{
    skillCode: string;
    specificContribution: string;
    componentWorkedOn?: string | null;
    actionsPerformed?: readonly string[];
    decisionsMade?: readonly string[];
    constraintsHandled?: readonly string[];
  }>;
};

export type QlixSmartContext = {
  clientRef: {
    projectId: string;
    studentId: string;
    skillCode: string;
  };
  projectBrief: {
    problem: string;
    approach: string;
    stack: string;
    outcome: string;
    loomUrl?: string;
    liveUrl?: string;
  };
  skillMapping: {
    specificContribution: string;
    componentWorkedOn?: string;
    actionsPerformed?: string[];
    decisionsMade?: string[];
    constraintsHandled?: string[];
  };
  competencyContext: {
    skillCode: string;
    skillName: string;
    competencies: Array<{
      competencyId: string;
      capability: string;
      difficulty: ProficiencyLevel;
      role: string;
      observableBehaviours?: string[];
      assessmentCriteria?: string[];
    }>;
  };
};

/** Build QLIX smartContext when the project has at least one skill mapping with a known blueprint. */
export function buildQlixSmartContext(input: QlixSmartContextInput): QlixSmartContext | null {
  const primary = input.skillMappings[0];
  if (!primary) return null;

  const blueprint = getSkillBlueprint(primary.skillCode);
  const definition = getSkillDefinition(primary.skillCode);
  if (!blueprint || !definition) return null;

  const competencies = blueprint.competencyModel.map((row) => ({
    competencyId: row.competencyId,
    capability: row.capability,
    difficulty: row.difficulty ?? ('BEGINNER' as ProficiencyLevel),
    role: row.role,
    observableBehaviours: [...row.observableBehaviours],
    assessmentCriteria: [...row.assessmentCriteria],
  }));

  if (competencies.length === 0) return null;

  return {
    clientRef: {
      projectId: input.projectId,
      studentId: input.studentId,
      skillCode: primary.skillCode,
    },
    projectBrief: {
      problem: input.problem.slice(0, 8_000),
      approach: input.approach.slice(0, 8_000),
      stack: input.stack.slice(0, 1_000),
      outcome: input.outcome.slice(0, 8_000),
      ...(input.loomUrl ? { loomUrl: input.loomUrl } : {}),
      ...(input.liveUrl ? { liveUrl: input.liveUrl } : {}),
    },
    skillMapping: {
      specificContribution: primary.specificContribution.slice(0, 4_000),
      ...(primary.componentWorkedOn
        ? { componentWorkedOn: primary.componentWorkedOn.slice(0, 1_000) }
        : {}),
      ...(primary.actionsPerformed?.length
        ? { actionsPerformed: primary.actionsPerformed.slice(0, 30).map((s) => s.slice(0, 500)) }
        : {}),
      ...(primary.decisionsMade?.length
        ? { decisionsMade: primary.decisionsMade.slice(0, 20).map((s) => s.slice(0, 500)) }
        : {}),
      ...(primary.constraintsHandled?.length
        ? {
            constraintsHandled: primary.constraintsHandled.slice(0, 20).map((s) => s.slice(0, 500)),
          }
        : {}),
    },
    competencyContext: {
      skillCode: primary.skillCode,
      skillName: definition.name.slice(0, 500),
      competencies,
    },
  };
}
