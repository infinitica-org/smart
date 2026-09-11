import { Injectable } from '@nestjs/common';
import {
  ACTIVE_TAXONOMY_VERSION,
  SKILL_DEFINITIONS,
  type LanguageBreakdownEntry,
  type SkillDimensionRefDto,
  type VectorizedSignalEntry,
} from '@smart/contracts';
import {
  GITHUB_LANGUAGE_MAPPING,
  SELF_SELECTED_SKILL_CONFIDENCE,
  SELF_SELECTED_SKILL_SCORE,
} from './github-language-mapping.js';

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

  private toDimension(dimensionKey: string, skillCode: string): SkillDimensionRefDto {
    return {
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      dimensionKey,
      skillCode,
    };
  }
}
