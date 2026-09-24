import { Inject, Injectable } from '@nestjs/common';
import {
  SKILL_DEFINITIONS,
  SocialVerificationSchema,
  TARGET_ROLES,
  getSkillBlueprint,
  qualifiesAsProvisionalDemonstrationEvidence,
  qualifiesAsSkillDemonstrationEvidence,
  resolveProficiencyVerification,
  type DemonstrationState,
  type EvidenceRequirementKind,
  type EvidenceRequirementRow,
  type EvidenceType,
  type EvidenceVerificationStatus,
  type IdentitySignal,
  type OpeningReadiness,
  type OpeningSkillRow,
  type OpeningSkillStatus,
  type ProficiencyRequirementLevel,
  type ReadinessEvidence,
  type ReadinessIdentity,
  type ReadinessProficiency,
  type ReadinessRecommendation,
  type ReadinessRole,
  type ReadinessSkillDemonstration,
  type RecommendationPriority,
  type RoleSkillRow,
  type SkillDemonstrationRow,
  type StudentReadinessSummary,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));
const RECOMMENDATION_LIMIT = 8;
const OPENING_LIMIT = 5;

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'PROFICIENT', 'ADVANCED', 'PROFESSIONAL'] as const;
const LEVEL_RANK: Record<string, number> = Object.fromEntries(
  LEVELS.map((level, index) => [level, index + 1]),
);

/** Why a catalog role has no readiness score of its own. */
export const ROLE_RULES_PENDING_REASON =
  'Catalog roles have no employer-defined minimum proficiency, so no readiness score is calculated for them. See the open roles below for scored readiness.';
export const NO_VERIFIED_SKILLS_REASON = 'Verify a skill to see which evidence it needs.';
export const NO_EVIDENCE_REQUIRED_REASON = 'No evidence is required at your verified levels.';
export const OPENING_WITHOUT_SKILLS_REASON =
  'This role does not list any required skills yet, so readiness cannot be calculated.';

export interface ClaimInput {
  status: string;
  proficiency: string;
  skill: { code: string; name: string };
}

export interface EvidenceInput {
  evidenceType: EvidenceType;
  relatedSkillCodes: readonly string[];
  verificationStatus: EvidenceVerificationStatus;
  sourceEntityId: string | null;
}

export interface OpeningInput {
  id: string;
  roleTitle: string;
  companyName: string;
  location: string | null;
  requiredSkills: { minProficiency: string; skill: { code: string; name?: string } }[];
}

export interface ReadinessInputs {
  emailVerified: boolean;
  onboardingDetails: unknown;
  targetRoleId: string | null;
  claims: readonly ClaimInput[];
  evidence: readonly EvidenceInput[];
  /** Ids of the student's projects that are fully under NDA. */
  ndaProjectIds: readonly string[];
  /** Open roles at the student's institution that list at least one required skill. */
  openings: readonly OpeningInput[];
}

function skillName(code: string, fallback?: string): string {
  return SKILL_NAME_BY_CODE.get(code) ?? fallback ?? code;
}

function rankOf(proficiency: string): number {
  return LEVEL_RANK[proficiency] ?? 1;
}

function asLevel(proficiency: string): ProficiencyRequirementLevel {
  return (LEVELS as readonly string[]).includes(proficiency)
    ? (proficiency as ProficiencyRequirementLevel)
    : 'BEGINNER';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/* ---------------------------------- I332 identity ---------------------------------- */

/**
 * VERIFIED when the account email is verified AND at least one provider-backed signal
 * (LinkedIn or GitHub) is verified. Pending and failed are not persisted anywhere yet, so they
 * are never returned.
 */
export function buildIdentity(input: {
  emailVerified: boolean;
  onboardingDetails: unknown;
}): ReadinessIdentity {
  const social = SocialVerificationSchema.safeParse(
    asRecord(input.onboardingDetails).socialVerification ?? {},
  );
  const linkedin = social.success ? social.data.linkedin : null;
  const github = social.success ? social.data.github : null;

  const signals: IdentitySignal[] = [
    { code: 'EMAIL', verified: input.emailVerified, verifiedAt: null },
    {
      code: 'LINKEDIN',
      verified: linkedin?.verified === true,
      verifiedAt: linkedin?.verified ? (linkedin.verifiedAt ?? null) : null,
    },
    {
      code: 'GITHUB',
      verified: github?.verified === true,
      verifiedAt: github?.verified ? (github.verifiedAt ?? null) : null,
    },
  ];

  const providerVerified = signals.some((s) => s.code !== 'EMAIL' && s.verified);
  return {
    status: input.emailVerified && providerVerified ? 'VERIFIED' : 'NOT_STARTED',
    signals,
    supportedStatuses: ['NOT_STARTED', 'VERIFIED'],
    rule: 'Verified when your email is verified and at least one of LinkedIn or GitHub is verified. Pending and failed states are not tracked yet.',
  };
}

/* ------------------------ I334 demonstration (shared evidence rules) ------------------------ */

function demonstrationFor(
  code: string,
  evidence: readonly EvidenceInput[],
): { state: DemonstrationState; verified: number; provisional: number } {
  let verified = 0;
  let provisional = 0;
  for (const row of evidence) {
    const params = {
      evidenceType: row.evidenceType,
      relatedSkillCodes: row.relatedSkillCodes,
      catalogSkillCode: code,
      verificationStatus: row.verificationStatus,
    };
    if (qualifiesAsSkillDemonstrationEvidence(params)) verified += 1;
    else if (qualifiesAsProvisionalDemonstrationEvidence(params)) provisional += 1;
  }
  const state: DemonstrationState =
    verified > 0 ? 'DEMONSTRATED' : provisional > 0 ? 'PROVISIONAL' : 'NOT_DEMONSTRATED';
  return { state, verified, provisional };
}

/** Skills the student holds fully-NDA project evidence for; that evidence cannot be disclosed. */
export function undisclosableSkillCodes(
  evidence: readonly EvidenceInput[],
  ndaProjectIds: readonly string[],
): Set<string> {
  const nda = new Set(ndaProjectIds);
  const codes = new Set<string>();
  for (const row of evidence) {
    if (row.evidenceType === 'PROJECT' && row.sourceEntityId && nda.has(row.sourceEntityId)) {
      for (const code of row.relatedSkillCodes) codes.add(code);
    }
  }
  return codes;
}

/** A declared claim carries a placeholder level; only a VERIFIED claim has a real proficiency. */
function proficiencyOf(claim: ClaimInput | undefined): string | null {
  return claim && claim.status === 'VERIFIED' ? claim.proficiency : null;
}

export function buildSkillDemonstration(
  claims: readonly ClaimInput[],
  evidence: readonly EvidenceInput[],
  undisclosable: ReadonlySet<string>,
): ReadinessSkillDemonstration {
  const skills: SkillDemonstrationRow[] = claims.map((claim) => {
    const d = demonstrationFor(claim.skill.code, evidence);
    return {
      skillCode: claim.skill.code,
      skillName: skillName(claim.skill.code, claim.skill.name),
      claimStatus: claim.status,
      proficiency: proficiencyOf(claim),
      demonstration: d.state,
      verifiedEvidenceCount: d.verified,
      provisionalEvidenceCount: d.provisional,
      evidenceUndisclosable: undisclosable.has(claim.skill.code),
    };
  });
  return {
    skills,
    counts: {
      demonstrated: skills.filter((s) => s.demonstration === 'DEMONSTRATED').length,
      provisional: skills.filter((s) => s.demonstration === 'PROVISIONAL').length,
      notDemonstrated: skills.filter((s) => s.demonstration === 'NOT_DEMONSTRATED').length,
    },
  };
}

/** Proficiency on its own: verified claims only, never mixed with evidence completeness. */
export function buildProficiency(claims: readonly ClaimInput[]): ReadinessProficiency {
  const byLevel: Record<string, number> = {};
  let verifiedSkillCount = 0;
  for (const claim of claims) {
    if (claim.status !== 'VERIFIED') continue;
    verifiedSkillCount += 1;
    byLevel[claim.proficiency] = (byLevel[claim.proficiency] ?? 0) + 1;
  }
  return {
    verifiedSkillCount,
    declaredSkillCount: claims.length - verifiedSkillCount,
    byLevel,
  };
}

/* --------------------------- I333 evidence completeness (blueprint rules) --------------------------- */

/**
 * The evidence a skill needs at a level, straight from the skill blueprint's proficiency
 * requirements (the same gates skill verification finalisation uses). Interviews are a gate with no
 * evidence record, so they are not counted here.
 */
export function requiredEvidenceFor(
  skillCode: string,
  level: ProficiencyRequirementLevel,
): EvidenceRequirementKind[] {
  const flags = resolveProficiencyVerification(
    getSkillBlueprint(skillCode)?.proficiencyRequirements ?? [],
    level,
  );
  const kinds: EvidenceRequirementKind[] = [];
  if (flags.realWorldApplicationRequired) kinds.push('REAL_WORLD_APPLICATION');
  if (flags.substantialApplicationRequired) kinds.push('SUBSTANTIAL_APPLICATION');
  return kinds;
}

/**
 * REAL_WORLD_APPLICATION: verified project or work-experience evidence for the skill.
 * SUBSTANTIAL_APPLICATION: verified PROJECT evidence for the skill (an owned, project-level build).
 */
export function isEvidenceRequirementMet(
  kind: EvidenceRequirementKind,
  skillCode: string,
  evidence: readonly EvidenceInput[],
): boolean {
  if (kind === 'REAL_WORLD_APPLICATION') {
    return demonstrationFor(skillCode, evidence).state === 'DEMONSTRATED';
  }
  return evidence.some(
    (row) =>
      row.evidenceType === 'PROJECT' &&
      qualifiesAsSkillDemonstrationEvidence({
        evidenceType: row.evidenceType,
        relatedSkillCodes: row.relatedSkillCodes,
        catalogSkillCode: skillCode,
        verificationStatus: row.verificationStatus,
      }),
  );
}

/**
 * Counts what exists by verification status, and measures completeness as: evidence items the
 * blueprint requires for the student's VERIFIED skills at their verified levels that are present,
 * over those required. With no verified skill there is nothing to measure (NO_DATA).
 */
export function buildEvidence(
  claims: readonly ClaimInput[],
  evidence: readonly EvidenceInput[],
): ReadinessEvidence {
  const counts = {
    total: evidence.length,
    verified: 0,
    provisional: 0,
    pending: 0,
    disputedOrRejected: 0,
    expired: 0,
  };
  for (const row of evidence) {
    switch (row.verificationStatus) {
      case 'VERIFIED':
        counts.verified += 1;
        break;
      case 'PROVISIONAL':
        counts.provisional += 1;
        break;
      case 'PENDING':
        counts.pending += 1;
        break;
      case 'DISPUTED':
      case 'REJECTED':
        counts.disputedOrRejected += 1;
        break;
      case 'EXPIRED':
        counts.expired += 1;
        break;
    }
  }

  const verifiedClaims = claims.filter((claim) => claim.status === 'VERIFIED');
  if (verifiedClaims.length === 0) {
    return {
      availability: 'NO_DATA',
      reason: NO_VERIFIED_SKILLS_REASON,
      requirements: [],
      counts,
      completeness: null,
    };
  }

  const requirements: EvidenceRequirementRow[] = [];
  for (const claim of verifiedClaims) {
    const level = asLevel(claim.proficiency);
    for (const kind of requiredEvidenceFor(claim.skill.code, level)) {
      requirements.push({
        skillCode: claim.skill.code,
        skillName: skillName(claim.skill.code, claim.skill.name),
        level,
        requirement: kind,
        met: isEvidenceRequirementMet(kind, claim.skill.code, evidence),
      });
    }
  }
  const required = requirements.length;
  const available = requirements.filter((row) => row.met).length;
  return {
    availability: 'AVAILABLE',
    reason: required === 0 ? NO_EVIDENCE_REQUIRED_REASON : null,
    requirements,
    counts,
    completeness: {
      required,
      available,
      percent: required === 0 ? 100 : Math.round((100 * available) / required),
    },
  };
}

/* ------------------------------ I336 role readiness (catalog role) ------------------------------ */

/**
 * A catalog role has recommended and optional skills but no employer-defined minimum proficiency,
 * so it never gets a score. Rows and coverage counts are real facts. OPTIONAL skills never affect
 * readiness (I338).
 */
export function buildRoleReadiness(
  targetRoleId: string | null,
  claims: readonly ClaimInput[],
  evidence: readonly EvidenceInput[],
  undisclosable: ReadonlySet<string>,
): ReadinessRole {
  const role = targetRoleId ? TARGET_ROLES.find((r) => r.roleId === targetRoleId) : undefined;
  if (!role) {
    return {
      availability: 'NO_TARGET_ROLE',
      reason: 'Choose a target role to see how your skills line up.',
      targetRole: null,
      readinessPercent: null,
      skills: [],
      coverage: null,
    };
  }

  const claimByCode = new Map(claims.map((claim) => [claim.skill.code, claim]));
  const row = (code: string, requirement: 'RECOMMENDED' | 'OPTIONAL'): RoleSkillRow => {
    const claim = claimByCode.get(code);
    return {
      skillCode: code,
      skillName: skillName(code, claim?.skill.name),
      requirement,
      affectsReadiness: requirement === 'RECOMMENDED',
      selected: claim !== undefined,
      claimStatus: claim?.status ?? null,
      proficiency: proficiencyOf(claim),
      demonstration: demonstrationFor(code, evidence).state,
      evidenceUndisclosable: undisclosable.has(code),
    };
  };
  const recommended = role.recommendedSkillIds.map((code) => row(code, 'RECOMMENDED'));
  const optional = role.optionalSkillIds.map((code) => row(code, 'OPTIONAL'));

  return {
    availability: 'NOT_CONFIGURED',
    reason: ROLE_RULES_PENDING_REASON,
    targetRole: { roleId: role.roleId, name: role.name },
    readinessPercent: null,
    skills: [...recommended, ...optional],
    coverage: {
      recommendedTotal: recommended.length,
      recommendedVerified: recommended.filter((s) => s.claimStatus === 'VERIFIED').length,
      recommendedDemonstrated: recommended.filter((s) => s.demonstration === 'DEMONSTRATED').length,
      optionalTotal: optional.length,
      optionalVerified: optional.filter((s) => s.claimStatus === 'VERIFIED').length,
    },
  };
}

/* ------------------------------ I336 readiness for a specific open role ------------------------------ */

/**
 * Readiness for one opening, using only employer-defined requirements: a required skill is READY
 * when the student's VERIFIED proficiency is at or above the opening's minimum AND every evidence
 * item the blueprint requires at that minimum level is present. readinessPercent is the share of
 * required skills that are ready; there are no weights and no defaults.
 */
export function buildOpeningReadiness(
  opening: OpeningInput,
  claims: readonly ClaimInput[],
  evidence: readonly EvidenceInput[],
): OpeningReadiness {
  const base = {
    openingId: opening.id,
    roleTitle: opening.roleTitle,
    companyName: opening.companyName,
    location: opening.location,
  };
  if (opening.requiredSkills.length === 0) {
    return {
      ...base,
      availability: 'NOT_CONFIGURED',
      reason: OPENING_WITHOUT_SKILLS_REASON,
      requiredCount: 0,
      readyCount: 0,
      readinessPercent: null,
      skills: [],
    };
  }

  const claimByCode = new Map(claims.map((claim) => [claim.skill.code, claim]));
  const skills: OpeningSkillRow[] = opening.requiredSkills.map((required) => {
    const code = required.skill.code;
    const claim = claimByCode.get(code);
    const minRank = rankOf(required.minProficiency);
    const status: OpeningSkillStatus = !claim
      ? 'NOT_HELD'
      : claim.status !== 'VERIFIED'
        ? 'NOT_VERIFIED'
        : rankOf(claim.proficiency) >= minRank
          ? 'MEETS_MINIMUM'
          : 'BELOW_MINIMUM';

    const kinds = requiredEvidenceFor(code, asLevel(required.minProficiency));
    const evidenceMet = kinds.filter((kind) =>
      isEvidenceRequirementMet(kind, code, evidence),
    ).length;
    return {
      skillCode: code,
      skillName: skillName(code, required.skill.name),
      minProficiency: required.minProficiency,
      studentProficiency: proficiencyOf(claim),
      status,
      evidenceRequired: kinds.length,
      evidenceMet,
      ready: status === 'MEETS_MINIMUM' && evidenceMet === kinds.length,
    };
  });

  const readyCount = skills.filter((skill) => skill.ready).length;
  return {
    ...base,
    availability: 'AVAILABLE',
    reason: null,
    requiredCount: skills.length,
    readyCount,
    readinessPercent: Math.round((100 * readyCount) / skills.length),
    skills,
  };
}

/** Best first (highest readiness, then the order given, which is newest first). */
export function buildOpeningReadinessList(
  openings: readonly OpeningInput[],
  claims: readonly ClaimInput[],
  evidence: readonly EvidenceInput[],
): OpeningReadiness[] {
  return openings
    .map((opening, index) => ({ item: buildOpeningReadiness(opening, claims, evidence), index }))
    .sort(
      (a, b) =>
        (b.item.readinessPercent ?? -1) - (a.item.readinessPercent ?? -1) || a.index - b.index,
    )
    .map(({ item }) => item)
    .slice(0, OPENING_LIMIT);
}

/* ------------------------------------ I337 recommendations ------------------------------------ */

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

const REQUIREMENT_TEXT: Record<EvidenceRequirementKind, string> = {
  REAL_WORLD_APPLICATION: 'a verified real-world project or work experience',
  SUBSTANTIAL_APPLICATION: 'a verified substantial project',
};

/**
 * One recommendation per skill, derived only from known gaps:
 *  - identity not verified;
 *  - evidence the blueprint requires for a verified skill's level that is missing (HIGH);
 *  - a recommended role skill that is not selected, not verified, or not demonstrated;
 *  - the gaps for the student's closest open role;
 *  - a verified skill with no demonstrating evidence.
 * Optional role skills are LOW priority and flagged optional; skills whose evidence is fully under
 * NDA are never asked for more evidence.
 */
export function buildRecommendations(input: {
  identity: ReadinessIdentity;
  evidence: ReadinessEvidence;
  demonstration: ReadinessSkillDemonstration;
  role: ReadinessRole;
  openings: readonly OpeningReadiness[];
}): ReadinessRecommendation[] {
  const items: ReadinessRecommendation[] = [];
  const seenSkills = new Set<string>();
  const undisclosable = new Set(
    input.demonstration.skills.filter((s) => s.evidenceUndisclosable).map((s) => s.skillCode),
  );

  if (input.identity.status !== 'VERIFIED') {
    items.push({
      id: 'identity',
      kind: 'VERIFY_IDENTITY',
      priority: 'MEDIUM',
      optional: false,
      skillCode: null,
      title: 'Verify your identity',
      detail:
        'Verify your email and connect LinkedIn or GitHub so employers can trust your profile.',
      href: '/profile?section=links',
    });
  }

  for (const req of input.evidence.requirements) {
    if (req.met || seenSkills.has(req.skillCode) || undisclosable.has(req.skillCode)) continue;
    items.push({
      id: `skill-${req.skillCode}`,
      kind: 'ADD_REQUIRED_EVIDENCE',
      priority: 'HIGH',
      optional: false,
      skillCode: req.skillCode,
      title: `Add evidence for ${req.skillName}`,
      detail: `${req.skillName} at ${req.level.toLowerCase()} level needs ${REQUIREMENT_TEXT[req.requirement]}.`,
      href: '/profile?section=projects',
    });
    seenSkills.add(req.skillCode);
  }

  for (const skill of input.role.skills) {
    if (seenSkills.has(skill.skillCode)) continue;
    const optional = skill.requirement === 'OPTIONAL';
    const priority = (high: 'HIGH' | 'MEDIUM'): RecommendationPriority => (optional ? 'LOW' : high);
    let rec: ReadinessRecommendation | null = null;

    if (!skill.selected) {
      rec = {
        id: `skill-${skill.skillCode}`,
        kind: 'ADD_ROLE_SKILL',
        priority: priority('HIGH'),
        optional,
        skillCode: skill.skillCode,
        title: `Add ${skill.skillName}`,
        detail: `${skill.skillName} is ${optional ? 'an optional' : 'a recommended'} skill for ${input.role.targetRole?.name ?? 'your target role'}.`,
        href: '/skills',
      };
    } else if (skill.claimStatus !== 'VERIFIED') {
      rec = {
        id: `skill-${skill.skillCode}`,
        kind: 'VERIFY_SKILL',
        priority: priority('HIGH'),
        optional,
        skillCode: skill.skillCode,
        title: `Verify ${skill.skillName}`,
        detail: 'Take the diagnostic assessment to verify this skill.',
        href: '/assessments',
      };
    } else if (skill.demonstration !== 'DEMONSTRATED' && !skill.evidenceUndisclosable) {
      rec = {
        id: `skill-${skill.skillCode}`,
        kind: 'ADD_DEMONSTRATION_EVIDENCE',
        priority: priority('MEDIUM'),
        optional,
        skillCode: skill.skillCode,
        title: `Show ${skill.skillName} in a project or role`,
        detail:
          skill.demonstration === 'PROVISIONAL'
            ? 'Your evidence for this skill is provisional. Finish its verification.'
            : 'Link a verified project or work experience that uses this skill.',
        href: '/profile?section=projects',
      };
    }
    if (rec) {
      items.push(rec);
      seenSkills.add(skill.skillCode);
    }
  }

  // The closest open role: what stands between the student and being ready for it.
  const closest = input.openings.find((opening) => opening.availability === 'AVAILABLE');
  if (closest) {
    const roleLabel = `${closest.roleTitle} at ${closest.companyName}`;
    for (const skill of closest.skills) {
      if (skill.ready || seenSkills.has(skill.skillCode)) continue;
      let rec: ReadinessRecommendation | null = null;
      if (skill.status === 'NOT_HELD') {
        rec = {
          id: `skill-${skill.skillCode}`,
          kind: 'ADD_ROLE_SKILL',
          priority: 'MEDIUM',
          optional: false,
          skillCode: skill.skillCode,
          title: `Add ${skill.skillName}`,
          detail: `${roleLabel} requires ${skill.skillName} at ${skill.minProficiency.toLowerCase()} level.`,
          href: '/skills',
        };
      } else if (skill.status === 'NOT_VERIFIED' || skill.status === 'BELOW_MINIMUM') {
        rec = {
          id: `skill-${skill.skillCode}`,
          kind: 'VERIFY_SKILL',
          priority: 'MEDIUM',
          optional: false,
          skillCode: skill.skillCode,
          title: `Verify ${skill.skillName} at ${skill.minProficiency.toLowerCase()} level`,
          detail: `${roleLabel} requires ${skill.skillName} at ${skill.minProficiency.toLowerCase()} level.`,
          href: '/assessments',
        };
      } else if (!undisclosable.has(skill.skillCode)) {
        rec = {
          id: `skill-${skill.skillCode}`,
          kind: 'ADD_REQUIRED_EVIDENCE',
          priority: 'MEDIUM',
          optional: false,
          skillCode: skill.skillCode,
          title: `Add evidence for ${skill.skillName}`,
          detail: `${roleLabel} needs verified project or work evidence for ${skill.skillName}.`,
          href: '/profile?section=projects',
        };
      }
      if (rec) {
        items.push(rec);
        seenSkills.add(skill.skillCode);
      }
    }
  }

  for (const skill of input.demonstration.skills) {
    if (seenSkills.has(skill.skillCode)) continue;
    if (
      skill.claimStatus === 'VERIFIED' &&
      skill.demonstration !== 'DEMONSTRATED' &&
      !skill.evidenceUndisclosable
    ) {
      items.push({
        id: `skill-${skill.skillCode}`,
        kind: 'ADD_DEMONSTRATION_EVIDENCE',
        priority: 'LOW',
        optional: false,
        skillCode: skill.skillCode,
        title: `Show ${skill.skillName} in a project or role`,
        detail:
          skill.demonstration === 'PROVISIONAL'
            ? 'Your evidence for this skill is provisional. Finish its verification.'
            : 'Link a verified project or work experience that uses this skill.',
        href: '/profile?section=projects',
      });
    }
  }

  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.item.priority] - PRIORITY_RANK[b.item.priority] || a.index - b.index,
    )
    .map(({ item }) => item)
    .slice(0, RECOMMENDATION_LIMIT);
}

/* --------------------------------------------- summary --------------------------------------------- */

export function buildReadinessSummary(inputs: ReadinessInputs): StudentReadinessSummary {
  const undisclosable = undisclosableSkillCodes(inputs.evidence, inputs.ndaProjectIds);
  const identity = buildIdentity(inputs);
  const evidence = buildEvidence(inputs.claims, inputs.evidence);
  const skillDemonstration = buildSkillDemonstration(inputs.claims, inputs.evidence, undisclosable);
  const roleReadiness = buildRoleReadiness(
    inputs.targetRoleId,
    inputs.claims,
    inputs.evidence,
    undisclosable,
  );
  const openingReadiness = buildOpeningReadinessList(
    inputs.openings,
    inputs.claims,
    inputs.evidence,
  );
  return {
    generatedAt: new Date().toISOString(),
    identity,
    evidence,
    skillDemonstration,
    proficiency: buildProficiency(inputs.claims),
    roleReadiness,
    openingReadiness,
    recommendations: buildRecommendations({
      identity,
      evidence,
      demonstration: skillDemonstration,
      role: roleReadiness,
      openings: openingReadiness,
    }),
  };
}

@Injectable()
export class ReadinessService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** One authorised read model; every student-specific query is scoped to `studentId`. */
  async getSummary(studentId: string): Promise<StudentReadinessSummary> {
    const [user, profile, claims, evidence, ndaProjects] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: { emailVerified: true, onboardingDetails: true, institutionId: true },
      }),
      this.prisma.candidateEvidenceProfile.findUnique({
        where: { studentId },
        select: { targetRoleId: true },
      }),
      this.prisma.skillClaim.findMany({
        where: { studentId },
        select: {
          status: true,
          proficiency: true,
          skill: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.evidenceRecord.findMany({
        where: { studentId },
        select: {
          evidenceType: true,
          relatedSkillCodes: true,
          verificationStatus: true,
          sourceEntityId: true,
        },
      }),
      this.prisma.project.findMany({
        where: { studentId, ndaStatus: 'FULL' },
        select: { id: true },
      }),
    ]);

    // Open roles at the student's own institution that state at least one required skill.
    const openings = user?.institutionId
      ? await this.prisma.jobOpening.findMany({
          where: {
            institutionId: user.institutionId,
            status: 'OPEN',
            requiredSkills: { some: {} },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            roleTitle: true,
            companyName: true,
            location: true,
            requiredSkills: {
              select: { minProficiency: true, skill: { select: { code: true, name: true } } },
            },
          },
        })
      : [];

    return buildReadinessSummary({
      emailVerified: user?.emailVerified ?? false,
      onboardingDetails: user?.onboardingDetails ?? null,
      targetRoleId: profile?.targetRoleId ?? null,
      claims,
      evidence,
      ndaProjectIds: ndaProjects.map((project) => project.id),
      openings,
    });
  }
}
