import { Injectable } from '@nestjs/common';
import {
  ACTIVE_TAXONOMY_VERSION,
  SKILL_DEFINITIONS,
  type HackerrankSolvedByTag,
  type LanguageBreakdownEntry,
  type LeetcodeTagStat,
  type SkillDimensionRefDto,
  type VectorizedSignalEntry,
} from '@smart/contracts';
import {
  GITHUB_LANGUAGE_MAPPING,
  SELF_SELECTED_SKILL_CONFIDENCE,
  SELF_SELECTED_SKILL_SCORE,
} from './github-language-mapping.js';
import {
  activityConfidenceCap,
  HACKERRANK_TAG_MAPPING,
  LEETCODE_TAG_MAPPING,
  solvedCountScore,
  type SignalTagMappingEntry,
} from './signal-tag-mapping.js';

/**
 * Maps raw GitHub onboarding features to versioned skill dimensions.
 *
 * Owner: Ramansh.
 */
@Injectable()
export class SkillDimensionResolver {
  private readonly skillNameToCode = new Map(
    SKILL_DEFINITIONS.map((skill) => [skill.name.toLowerCase(), skill.code]),
  );

  resolveGithubLanguages(
    languages: readonly LanguageBreakdownEntry[],
  ): readonly VectorizedSignalEntry[] {
    const byDimension = new Map<string, VectorizedSignalEntry>();

    for (const lang of languages) {
      const mappings = GITHUB_LANGUAGE_MAPPING[lang.language.toLowerCase()];
      if (!mappings) continue;

      for (const mapping of mappings) {
        const dimension = this.toDimension(mapping.dimensionKey, mapping.skillCode);
        const score = Math.min(1, lang.byteShare * mapping.weight);
        let confidence = Math.min(1, 0.5 + lang.repoCount * 0.1);
        if (lang.repoCount <= 1) confidence = Math.min(confidence, 0.45);
        if (lang.byteShare >= 0.9) confidence = Math.min(confidence, 0.5);
        const key = dimension.dimensionKey;
        const existing = byDimension.get(key);
        if (!existing || score > existing.score) {
          byDimension.set(key, {
            dimension,
            sourceId: 'GITHUB',
            score,
            confidence,
          });
        }
      }
    }

    return [...byDimension.values()];
  }

  resolveSelectedSkillNames(skillNames: readonly string[]): readonly VectorizedSignalEntry[] {
    const entries: VectorizedSignalEntry[] = [];

    for (const name of skillNames) {
      const code = this.skillNameToCode.get(name.trim().toLowerCase());
      if (!code) continue;
      entries.push({
        dimension: this.toDimension(code, code),
        sourceId: 'GITHUB',
        score: SELF_SELECTED_SKILL_SCORE,
        confidence: SELF_SELECTED_SKILL_CONFIDENCE,
      });
    }

    return entries;
  }

  resolveHackerrankTags(
    solvedByTag: readonly HackerrankSolvedByTag[],
  ): readonly VectorizedSignalEntry[] {
    const byDimension = new Map<string, VectorizedSignalEntry>();
    for (const row of solvedByTag) {
      const mapping = this.lookupTagMapping(HACKERRANK_TAG_MAPPING, row.tag);
      if (!mapping) continue;
      const score = Math.min(1, solvedCountScore(row.count) * mapping.weight);
      const confidence = Math.min(0.85, 0.4 + solvedCountScore(row.count, 20) * 0.45);
      this.upsertDimensionEntry(byDimension, mapping, 'HACKERRANK', score, confidence);
    }
    return [...byDimension.values()];
  }

  resolveLeetcodeTags(
    tagStats: readonly LeetcodeTagStat[],
    recentActivityDays: number,
  ): readonly VectorizedSignalEntry[] {
    const activityCap = activityConfidenceCap(recentActivityDays);
    const byDimension = new Map<string, VectorizedSignalEntry>();
    for (const row of tagStats) {
      const mapping = this.lookupTagMapping(LEETCODE_TAG_MAPPING, row.tagSlug);
      if (!mapping) continue;
      const score = Math.min(1, solvedCountScore(row.problemsSolved) * mapping.weight);
      const confidence = Math.min(
        activityCap,
        0.35 + solvedCountScore(row.problemsSolved, 30) * 0.5,
      );
      this.upsertDimensionEntry(byDimension, mapping, 'LEETCODE', score, confidence);
    }
    return [...byDimension.values()];
  }

  private lookupTagMapping(
    table: Readonly<Record<string, SignalTagMappingEntry>>,
    tag: string,
  ): SignalTagMappingEntry | undefined {
    return table[tag.trim().toLowerCase()];
  }

  private upsertDimensionEntry(
    byDimension: Map<string, VectorizedSignalEntry>,
    mapping: SignalTagMappingEntry,
    sourceId: 'HACKERRANK' | 'LEETCODE',
    score: number,
    confidence: number,
  ): void {
    const dimension = this.toDimension(mapping.dimensionKey, mapping.skillCode);
    const key = dimension.dimensionKey;
    const existing = byDimension.get(key);
    if (!existing || score > existing.score) {
      byDimension.set(key, { dimension, sourceId, score, confidence });
    }
  }

  private toDimension(dimensionKey: string, skillCode: string): SkillDimensionRefDto {
    return {
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      dimensionKey,
      skillCode,
    };
  }
}
