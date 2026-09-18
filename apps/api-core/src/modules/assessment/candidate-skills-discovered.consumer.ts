import type { OnModuleInit } from '@nestjs/common';
import { ConflictException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  CandidateSkillsDiscoveredEventSchema,
  SKILL_CODE_SET,
  SKILL_DEFINITIONS,
  SMART_TOPICS,
  type LanguageBreakdownEntry,
} from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { AssessmentService } from './assessment.service.js';

/**
 * CN-T01 — best-effort onboarding-skill -> Software & IT catalog mapping.
 *
 * The catalog (`SKILL_DEFINITIONS`) is coarse and competency-based (e.g. one
 * `LANGUAGE_PROFICIENCY` skill covers Java/Python/JS/C++ together) — there is
 * no per-language skill to match 1:1. This only ever auto-declares at
 * BEGINNER (never higher) and tags the claim's provenance so it's fully
 * auditable — verification still runs through the exact same assessment
 * gate as any other DECLARED claim.
 *
 * A name reaches here two ways: the student typed/checked it directly during
 * onboarding (a real self-declaration — no evidence threshold needed), or it
 * carries GitHub repo byte-share data (a weaker, inferred signal — could be a
 * tutorial follow-along or a fork's leftover boilerplate). Direct
 * self-declarations are tagged `source: MANUAL` (the same meaning as
 * declaring a skill from the Profile page); only names actually backed by
 * repo byte-share are tagged `source: GITHUB_DERIVED`.
 */
const LANGUAGE_SKILL_HINTS: Record<string, readonly string[]> = {
  javascript: ['JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT'],
  typescript: ['JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT'],
  python: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
  java: ['JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT'],
  'c++': ['C_SYSTEMS_PERFORMANCE_ENGINEERING'],
  c: ['C_SYSTEMS_PERFORMANCE_ENGINEERING'],
  go: ['GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES'],
  rust: ['RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING'],
  ruby: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
  php: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
  kotlin: ['KOTLIN_FOR_ANDROID_BACKEND_SERVICES'],
  swift: ['SWIFT_FOR_IOS_MACOS_DEVELOPMENT'],
  sql: ['SQL_QUERY_OPTIMIZATION'],
  plpgsql: ['SQL_QUERY_OPTIMIZATION'],
  html: ['MODERN_FRONTEND_FRAMEWORKS'],
  css: ['MODERN_FRONTEND_FRAMEWORKS'],
  scss: ['MODERN_FRONTEND_FRAMEWORKS'],
  vue: ['MODERN_FRONTEND_FRAMEWORKS'],
  dockerfile: ['CONTAINERIZATION_ORCHESTRATION'],
  shell: ['LINUX_SYSTEMS_ADMINISTRATION'],
  'jupyter notebook': [
    'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
  ],
};

/**
 * Case-insensitive catalog skill NAME -> code, e.g. "system design & architecture" ->
 * SYSTEM_DESIGN_ARCHITECTURE. Lets the onboarding "Top skills" picker (which now offers
 * catalog names, not arbitrary free text) resolve straight to a real skillCode, alongside
 * the raw-language route through LANGUAGE_SKILL_HINTS below.
 */
const SKILL_NAME_TO_CODE = new Map(
  SKILL_DEFINITIONS.map((skill) => [skill.name.toLowerCase(), skill.code]),
);

/**
 * Resolves one onboarding-selected name to the catalog skillCode(s) it implies:
 * a direct code (defensive — nothing sends codes today, but cheap to honor), a catalog
 * skill name (the "Top skills" picker's own suggestions and manual search results), or a
 * raw GitHub language name via `LANGUAGE_SKILL_HINTS`. Names matching none of the three
 * are simply not real, mappable skills and are dropped.
 */
function resolveSkillCodes(name: string): readonly string[] {
  const trimmed = name.trim();
  if (SKILL_CODE_SET.has(trimmed.toUpperCase())) return [trimmed.toUpperCase()];
  const byName = SKILL_NAME_TO_CODE.get(trimmed.toLowerCase());
  if (byName) return [byName];
  return LANGUAGE_SKILL_HINTS[trimmed.toLowerCase()] ?? [];
}

/** Hard cap so one onboarding never floods a student with auto-declared claims. */
const MAX_AUTO_DECLARED_SKILLS = 5;

interface SkillCandidate {
  skillCode: string;
  /** Ranking weight only — GitHub byte-share when available, else a flat 1 for a direct pick. */
  weight: number;
  languages: string[];
  /** True only if at least one contributing name carried real repo byte-share evidence. */
  hasGithubEvidence: boolean;
}

/**
 * Every name the student kept selected in onboarding is a real signal on its
 * own — GitHub byte-share (when present for that name) only breaks ties in
 * ranking, it is never a gate a self-declared skill has to clear.
 */
export function deriveSkillCandidates(
  selectedSkillNames: readonly string[],
  languages: readonly LanguageBreakdownEntry[],
): SkillCandidate[] {
  const byteShareByName = new Map(
    languages.map((entry) => [entry.language.toLowerCase(), entry.byteShare]),
  );
  const bySkill = new Map<string, SkillCandidate>();
  for (const name of selectedSkillNames) {
    const hints = resolveSkillCodes(name);
    if (hints.length === 0) continue;
    const byteShare = byteShareByName.get(name.toLowerCase());
    const weight = byteShare ?? 1;
    for (const skillCode of hints) {
      const existing = bySkill.get(skillCode);
      if (existing) {
        existing.weight += weight;
        existing.languages.push(name);
        existing.hasGithubEvidence = existing.hasGithubEvidence || byteShare !== undefined;
      } else {
        bySkill.set(skillCode, {
          skillCode,
          weight,
          languages: [name],
          hasGithubEvidence: byteShare !== undefined,
        });
      }
    }
  }
  return Array.from(bySkill.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_AUTO_DECLARED_SKILLS);
}

/**
 * Consumes `smart.candidate.skills_discovered` (produced by `users` on
 * onboarding completion) and best-effort auto-declares matching catalog
 * skills. Runs async, off the request path — a slow or failed match must
 * never affect onboarding completion, which already succeeded before this
 * event was even enqueued.
 */
@Injectable()
export class CandidateSkillsDiscoveredConsumer implements OnModuleInit {
  private readonly logger = new Logger(CandidateSkillsDiscoveredConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(AssessmentService) private readonly assessment: AssessmentService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.candidateSkillsDiscovered,
        module: 'assessment',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = CandidateSkillsDiscoveredEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed candidate.skills_discovered payload');
              return;
            }
            const { userId, languages, selectedSkillNames } = parsed.data.data;
            const candidates = deriveSkillCandidates(selectedSkillNames, languages);
            for (const candidate of candidates) {
              await this.tryDeclare(userId, candidate);
            }
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `candidate.skills_discovered consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async tryDeclare(userId: string, candidate: SkillCandidate): Promise<void> {
    try {
      await this.assessment.declareSkillClaim(
        { sub: userId, role: 'STUDENT', inst: null },
        { skillCode: candidate.skillCode, proficiency: 'BEGINNER' },
        candidate.hasGithubEvidence
          ? {
              source: 'GITHUB_DERIVED',
              sourceMetadata: { languages: candidate.languages, weight: candidate.weight },
            }
          : undefined,
      );
    } catch (error) {
      // Already claimed (manually or from a prior run) or currently locked —
      // both are expected, common outcomes here, not failures to alert on.
      if (error instanceof ConflictException || error instanceof ForbiddenException) {
        this.logger.debug(
          `Skipped GitHub-derived declare for ${candidate.skillCode} (user ${userId}): already claimed/locked`,
        );
        return;
      }
      this.logger.warn(
        `GitHub-derived declare failed for ${candidate.skillCode} (user ${userId}): ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }
}
