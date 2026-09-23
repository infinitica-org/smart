import { FUSION_RULE_SET_VERSION } from '@smart/contracts';
import type { SkillCompetency, CompetencyStatus, TrustTier } from '@smart/contracts';
import { difficultyIndex } from './admissibility.js';

export { FUSION_RULE_SET_VERSION };

export interface FusionRuleContext {
  role: SkillCompetency['role'];
  difficulty: SkillCompetency['difficulty'];
  assessmentStatus: CompetencyStatus | null;
  projectStatus: CompetencyStatus | null;
  projectTrust: TrustTier | null;
}

export interface UpgradeRuleResult {
  ruleId: string;
  status: CompetencyStatus;
  decisiveSource: 'ASSESSMENT' | 'PROJECT';
  resolvedConflict?: boolean;
  emitsResolvedConflict?: boolean;
}

export interface VetoEffect {
  statusCeiling?: CompetencyStatus;
  statusFloor?: CompetencyStatus;
  divergenceId?: string;
  domainCap?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
  ignoreProject?: boolean;
  unresolvedConflict?: boolean;
  forceProvisionalSettlement?: boolean;
}

export interface VetoInput extends FusionRuleContext {
  candidateStatus: CompetencyStatus;
  projectFlags: string[];
  appliedCeiling: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL' | null;
  preferProvisionalOnCriticalConflict: boolean;
}

function assessmentDemonstrated(ctx: FusionRuleContext): boolean {
  return ctx.assessmentStatus === 'DEMONSTRATED';
}

function projectDemonstrated(ctx: FusionRuleContext): boolean {
  return ctx.projectStatus === 'DEMONSTRATED';
}

function projectContradicts(ctx: FusionRuleContext): boolean {
  return ctx.assessmentStatus === 'DEMONSTRATED' && ctx.projectStatus === 'NOT_DEMONSTRATED';
}

function projectTrusted(ctx: FusionRuleContext): boolean {
  return ctx.projectTrust === 'TRUSTED';
}

function projectTrustAtLeastProvisional(ctx: FusionRuleContext): boolean {
  return ctx.projectTrust === 'TRUSTED' || ctx.projectTrust === 'PROVISIONAL';
}

export function projectUpgradeRoleGuard(ctx: FusionRuleContext): boolean {
  return ctx.role !== 'core' || difficultyIndex(ctx.difficulty) > difficultyIndex('INTERMEDIATE');
}

export const FUSION_UPGRADE_RULES_V1: ReadonlyArray<{
  ruleId: string;
  priority: number;
  matches: (ctx: FusionRuleContext) => boolean;
  result: CompetencyStatus;
  decisiveSource: 'ASSESSMENT' | 'PROJECT';
  emitsResolvedConflict?: boolean;
}> = [
  {
    ruleId: 'R-ASSESS-PASS-01',
    priority: 10,
    matches: (ctx) => ctx.assessmentStatus === 'DEMONSTRATED' && !projectContradicts(ctx),
    result: 'DEMONSTRATED',
    decisiveSource: 'ASSESSMENT',
  },
  {
    ruleId: 'R-CORE-THEORY-01',
    priority: 20,
    matches: (ctx) =>
      ctx.role === 'core' &&
      difficultyIndex(ctx.difficulty) <= difficultyIndex('INTERMEDIATE') &&
      ctx.assessmentStatus !== null &&
      ctx.assessmentStatus !== 'DEMONSTRATED',
    result: 'DEMONSTRATED',
    decisiveSource: 'ASSESSMENT',
  },
  {
    ruleId: 'R-PROJ-CONF-01',
    priority: 30,
    matches: (ctx) => assessmentDemonstrated(ctx) && projectDemonstrated(ctx),
    result: 'DEMONSTRATED',
    decisiveSource: 'PROJECT',
  },
  {
    ruleId: 'R-PROJ-CONF-02',
    priority: 40,
    matches: (ctx) => projectContradicts(ctx),
    result: 'PARTIALLY_DEMONSTRATED',
    decisiveSource: 'ASSESSMENT',
    emitsResolvedConflict: true,
  },
  {
    ruleId: 'R-PROJ-UPGRADE-01B',
    priority: 50,
    matches: (ctx) =>
      projectUpgradeRoleGuard(ctx) &&
      ctx.assessmentStatus === 'UNCERTAIN' &&
      projectDemonstrated(ctx) &&
      projectTrusted(ctx),
    result: 'DEMONSTRATED',
    decisiveSource: 'PROJECT',
  },
  {
    ruleId: 'R-PROJ-UPGRADE-02',
    priority: 60,
    matches: (ctx) =>
      projectUpgradeRoleGuard(ctx) &&
      ctx.assessmentStatus === 'UNCERTAIN' &&
      ctx.projectStatus === 'PARTIALLY_DEMONSTRATED' &&
      projectTrustAtLeastProvisional(ctx),
    result: 'PARTIALLY_DEMONSTRATED',
    decisiveSource: 'PROJECT',
  },
  {
    ruleId: 'R-PROJ-UPGRADE-01A',
    priority: 70,
    matches: (ctx) =>
      projectUpgradeRoleGuard(ctx) &&
      ctx.assessmentStatus === 'NOT_TESTED' &&
      projectDemonstrated(ctx) &&
      projectTrusted(ctx),
    result: 'PARTIALLY_DEMONSTRATED',
    decisiveSource: 'PROJECT',
  },
  {
    ruleId: 'R-PROJ-UPGRADE-03',
    priority: 80,
    matches: (ctx) =>
      projectUpgradeRoleGuard(ctx) &&
      ctx.assessmentStatus === 'NOT_TESTED' &&
      ctx.projectStatus === 'PARTIALLY_DEMONSTRATED',
    result: 'UNCERTAIN',
    decisiveSource: 'PROJECT',
  },
  {
    ruleId: 'R-DEFAULT-01',
    priority: 90,
    matches: () => true,
    result: 'NOT_TESTED',
    decisiveSource: 'ASSESSMENT',
  },
];

export const FUSION_VETOS_V1: ReadonlyArray<{
  vetoId: string;
  applies: (input: VetoInput) => VetoEffect | null;
}> = [
  {
    vetoId: 'V-ASSESS-FLOOR-01',
    applies: (input) => {
      if (input.assessmentStatus !== 'NOT_DEMONSTRATED') return null;
      const projectStrong =
        input.projectStatus === 'PARTIALLY_DEMONSTRATED' || input.projectStatus === 'DEMONSTRATED';
      return {
        statusCeiling: 'UNCERTAIN',
        statusFloor: projectStrong ? 'UNCERTAIN' : undefined,
        divergenceId: projectStrong ? 'D-ASSESS-PROJ-01' : undefined,
      };
    },
  },
  {
    vetoId: 'V-PLAG-01',
    applies: (input) => {
      const plag = input.projectFlags.some(
        (f) => f === 'DUPLICATE_TEXT' || f === 'PUBLIC_WEB_SIMILARITY',
      );
      return plag ? { domainCap: 'INTERMEDIATE' } : null;
    },
  },
  {
    vetoId: 'V-DEDUP-01',
    applies: (input) =>
      input.projectFlags.includes('CROSS_STUDENT_REPO_DUPLICATE')
        ? { domainCap: 'INTERMEDIATE' }
        : null,
  },
  {
    vetoId: 'V-AUTH-01',
    applies: (input) => (input.projectTrust === 'UNTRUSTED' ? { ignoreProject: true } : null),
  },
  {
    vetoId: 'V-CEIL-01',
    applies: (input) => (input.appliedCeiling ? { domainCap: input.appliedCeiling } : null),
  },
  {
    vetoId: 'V-CONFLICT-01',
    applies: (input) => {
      if (!input.preferProvisionalOnCriticalConflict) return null;
      if (input.role !== 'critical') return null;
      if (input.candidateStatus === 'PARTIALLY_DEMONSTRATED') return null;
      return { unresolvedConflict: true, forceProvisionalSettlement: true };
    },
  },
  {
    vetoId: 'V-INTEGRITY-01',
    applies: () => null,
  },
];

export function evaluateUpgradeRule(ctx: FusionRuleContext): UpgradeRuleResult {
  const sorted = [...FUSION_UPGRADE_RULES_V1].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (!rule.matches(ctx)) continue;
    if (rule.ruleId === 'R-CORE-THEORY-01') {
      return {
        ruleId: rule.ruleId,
        status: ctx.assessmentStatus ?? 'NOT_TESTED',
        decisiveSource: 'ASSESSMENT',
      };
    }
    if (rule.ruleId === 'R-DEFAULT-01') {
      return {
        ruleId: rule.ruleId,
        status: ctx.assessmentStatus ?? 'NOT_TESTED',
        decisiveSource: 'ASSESSMENT',
      };
    }
    return {
      ruleId: rule.ruleId,
      status: rule.result,
      decisiveSource: rule.decisiveSource,
      resolvedConflict: rule.emitsResolvedConflict,
      emitsResolvedConflict: rule.emitsResolvedConflict,
    };
  }
  return {
    ruleId: 'R-FALLBACK-MIN-01',
    status: ctx.assessmentStatus ?? 'NOT_TESTED',
    decisiveSource: 'ASSESSMENT',
  };
}

export const DOMAIN_VETO_IDS = ['V-PLAG-01', 'V-DEDUP-01', 'V-INTEGRITY-01'] as const;
