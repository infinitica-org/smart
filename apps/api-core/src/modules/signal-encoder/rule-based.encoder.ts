import { Inject, Injectable } from '@nestjs/common';
import {
  ACTIVE_TAXONOMY_VERSION,
  type HackerrankRawPayload,
  type LanguageBreakdownEntry,
  type LeetcodeRawPayload,
  type SignalSourceId,
  type VectorizedSignal,
  type VectorizedSignalEntry,
} from '@smart/contracts';
import { SkillDimensionResolver } from './skill-dimension.resolver.js';

export interface EncodeGithubInput {
  readonly userId: string;
  readonly languages: readonly LanguageBreakdownEntry[];
  readonly selectedSkillNames: readonly string[];
  readonly encodedAt: string;
  readonly consentScope?: string;
  readonly fetchedAt?: string;
}

export interface EncodeHackerrankInput {
  readonly userId: string;
  readonly payload: HackerrankRawPayload;
  readonly consentScope: string;
  readonly fetchedAt: string;
  readonly encodedAt: string;
}

export interface EncodeLeetcodeInput {
  readonly userId: string;
  readonly payload: LeetcodeRawPayload;
  readonly consentScope: string;
  readonly fetchedAt: string;
  readonly encodedAt: string;
}

/**
 * Rule-based passive signal encoder (no LLM). HR/LC return empty until adapters land.
 *
 * Owner: Ramansh.
 */
@Injectable()
export class RuleBasedEncoder {
  constructor(@Inject(SkillDimensionResolver) private readonly resolver: SkillDimensionResolver) {}

  encodeGithub(input: EncodeGithubInput): VectorizedSignal {
    const fromLanguages = this.resolver.resolveGithubLanguages(input.languages);
    const fromNames = this.resolver.resolveSelectedSkillNames(input.selectedSkillNames);
    const entries = this.mergeEntries([...fromLanguages, ...fromNames]);

    return {
      userId: input.userId,
      sourceId: 'GITHUB',
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      encodedAt: input.encodedAt,
      entries,
      consentScope: input.consentScope ?? 'github.onboarding.public_repos',
      fetchedAt: input.fetchedAt ?? input.encodedAt,
    };
  }

  encodeHackerrank(input: EncodeHackerrankInput): VectorizedSignal {
    const entries = this.mergeEntries(
      this.resolver.resolveHackerrankTags(input.payload.solvedByTag),
    );
    return {
      userId: input.userId,
      sourceId: 'HACKERRANK',
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      encodedAt: input.encodedAt,
      entries,
      consentScope: input.consentScope,
      fetchedAt: input.fetchedAt,
    };
  }

  encodeLeetcode(input: EncodeLeetcodeInput): VectorizedSignal {
    const entries = this.mergeEntries(
      this.resolver.resolveLeetcodeTags(input.payload.tagStats, input.payload.recentActivityDays),
    );
    return {
      userId: input.userId,
      sourceId: 'LEETCODE',
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      encodedAt: input.encodedAt,
      entries,
      consentScope: input.consentScope,
      fetchedAt: input.fetchedAt,
    };
  }

  /** @deprecated Use encodeHackerrank / encodeLeetcode — kept for transitional tests. */
  encodeStub(
    sourceId: Extract<SignalSourceId, 'HACKERRANK' | 'LEETCODE'>,
    userId: string,
  ): VectorizedSignal {
    return {
      userId,
      sourceId,
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      encodedAt: new Date().toISOString(),
      entries: [],
    };
  }

  private mergeEntries(entries: readonly VectorizedSignalEntry[]): VectorizedSignalEntry[] {
    const byKey = new Map<string, VectorizedSignalEntry>();
    for (const entry of entries) {
      const key = entry.dimension.dimensionKey;
      const existing = byKey.get(key);
      if (!existing || entry.score > existing.score) {
        byKey.set(key, entry);
      }
    }
    return [...byKey.values()];
  }
}
