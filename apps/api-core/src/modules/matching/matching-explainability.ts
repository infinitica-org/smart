import { getSkillBlueprint } from '@smart/contracts';
import { QlixSmartAssessmentSchema } from '../evaluation/qlix-client.js';

export type RulesExplainability = {
  strongCompetencies: readonly string[];
  gapCompetencies: readonly string[];
  why?: string;
};

export type QlixProjectExplainability = {
  skillCodes: readonly string[];
  gaps: readonly string[];
  smartAssessmentJson: unknown;
};

export type CapabilityExplainabilityRow = {
  capabilityLabel: string;
  skillCode: string | null;
  assessmentVerified: boolean;
  confidenceScore: number;
};

const DEMONSTRATED = new Set(['DEMONSTRATED', 'PARTIALLY_DEMONSTRATED']);

export function isCompanyVisibleCapability(row: CapabilityExplainabilityRow): boolean {
  return row.assessmentVerified && row.confidenceScore >= 0.55;
}

export function qlixGapsForVerifiedSkills(
  projects: readonly QlixProjectExplainability[],
  verifiedSkillCodes: ReadonlySet<string>,
): string[] {
  const gaps = new Set<string>();
  for (const project of projects) {
    const linked = project.skillCodes.some((code) => verifiedSkillCodes.has(code));
    if (!linked) continue;
    for (const gap of project.gaps) {
      const trimmed = gap.trim();
      if (trimmed) gaps.add(trimmed.slice(0, 200));
    }
  }
  return [...gaps];
}

export function qlixStrongFromSmartAssessment(
  projects: readonly QlixProjectExplainability[],
  verifiedSkillCodes: ReadonlySet<string>,
): string[] {
  const strong = new Set<string>();
  for (const project of projects) {
    if (!project.skillCodes.some((code) => verifiedSkillCodes.has(code))) continue;
    const parsed = QlixSmartAssessmentSchema.safeParse(project.smartAssessmentJson);
    if (!parsed.success) continue;
    for (const skillCode of project.skillCodes) {
      if (!verifiedSkillCodes.has(skillCode)) continue;
      const blueprint = getSkillBlueprint(skillCode);
      const byId = new Map(
        (blueprint?.competencyModel ?? []).map((row) => [row.competencyId, row.capability]),
      );
      for (const obs of parsed.data.competencyObservations ?? []) {
        if (!obs.status || !DEMONSTRATED.has(obs.status)) continue;
        const label = byId.get(obs.competencyId);
        if (label) strong.add(label.slice(0, 200));
      }
    }
  }
  return [...strong];
}

export function mergeMatchExplainability(
  rules: RulesExplainability,
  input: {
    capabilityRows: readonly CapabilityExplainabilityRow[];
    qlixProjects: readonly QlixProjectExplainability[];
    verifiedSkillCodes: readonly string[];
  },
): { strongCompetencies: string[]; gapCompetencies: string[]; why?: string } {
  const verified = new Set(input.verifiedSkillCodes);
  const strong = new Set<string>(rules.strongCompetencies);
  const gaps = new Set<string>(rules.gapCompetencies);

  for (const row of input.capabilityRows) {
    if (!isCompanyVisibleCapability(row)) continue;
    if (row.skillCode && !verified.has(row.skillCode)) continue;
    strong.add(row.capabilityLabel.slice(0, 200));
  }

  for (const label of qlixStrongFromSmartAssessment(input.qlixProjects, verified)) {
    strong.add(label);
  }

  for (const gap of qlixGapsForVerifiedSkills(input.qlixProjects, verified)) {
    gaps.add(gap);
  }

  const why = appendQlixNote(rules.why, input.qlixProjects, verified);

  return {
    strongCompetencies: [...strong],
    gapCompetencies: [...gaps],
    why,
  };
}

function appendQlixNote(
  why: string | undefined,
  projects: readonly QlixProjectExplainability[],
  verified: ReadonlySet<string>,
): string | undefined {
  const linked = projects.filter((project) =>
    project.skillCodes.some((code) => verified.has(code)),
  );
  if (linked.length === 0) return why;

  let ceiling: string | null = null;
  for (const project of linked) {
    const parsed = QlixSmartAssessmentSchema.safeParse(project.smartAssessmentJson);
    const value = parsed.success ? parsed.data.appliedProficiencyCeiling : null;
    if (value && (!ceiling || value > ceiling)) ceiling = value;
  }

  const note = ceiling
    ? `QLIX project ceiling: ${ceiling} (${linked.length} verified-skill project${linked.length === 1 ? '' : 's'}).`
    : `QLIX evidence from ${linked.length} verified-skill project${linked.length === 1 ? '' : 's'}.`;

  const combined = [why, note].filter(Boolean).join(' ');
  return combined.slice(0, 280);
}
