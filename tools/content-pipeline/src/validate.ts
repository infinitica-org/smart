import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  QuestionSchema,
  SkillLibraryResponseSchema,
  TRACK_DEFINITIONS,
  assertDomainWeightsSumToOne,
  assertSkillTaxonomyMatchesCanonical,
} from '@smart/contracts';
import { ItemAuthoringSchema } from './schema.js';

export const CONTENT_DATA_GLOB = 'data/**/*.json';

export interface ValidationReport {
  ok: boolean;
  messages: string[];
  itemCount: number;
}

function defaultDataFiles(cwd: string): string[] {
  return globSync(CONTENT_DATA_GLOB, { cwd }).map((file) => path.join(cwd, file));
}

/**
 * Validates track domain-weight definitions plus every authored item file.
 * `files`, when provided (e.g. from `lint-staged`), narrows validation to
 * those paths instead of the full `data/` directory. `cwd` defaults to the
 * process's working directory, which is `tools/content-pipeline` for every
 * npm script that invokes this CLI.
 */
export function runValidate(files?: string[], cwd: string = process.cwd()): ValidationReport {
  const messages: string[] = [];
  let ok = true;

  for (const track of TRACK_DEFINITIONS) {
    try {
      assertDomainWeightsSumToOne(track);
    } catch (error) {
      ok = false;
      messages.push(error instanceof Error ? error.message : String(error));
    }
  }

  const targets = (files && files.length > 0 ? files : defaultDataFiles(cwd)).filter((file) =>
    file.endsWith('.json'),
  );

  const seenItemIds = new Map<string, string>();
  let itemCount = 0;

  for (const file of targets) {
    const relative = path.relative(cwd, file);
    let raw: string;
    try {
      raw = readFileSync(file, 'utf8');
    } catch (error) {
      ok = false;
      messages.push(`${relative}: unable to read file (${String(error)})`);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      ok = false;
      messages.push(
        `${relative}: invalid JSON (${error instanceof Error ? error.message : String(error)})`,
      );
      continue;
    }

    if (relative.replace(/\\/g, '/').endsWith('taxonomies/skill.json')) {
      const result = SkillLibraryResponseSchema.safeParse(parsed);
      if (!result.success) {
        ok = false;
        for (const issue of result.error.issues) {
          const at = issue.path.length > 0 ? issue.path.join('.') : '(root)';
          messages.push(`${relative}: ${at} — ${issue.message}`);
        }
      } else {
        try {
          assertSkillTaxonomyMatchesCanonical(result.data);
        } catch (error) {
          ok = false;
          messages.push(`${relative}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      continue;
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const [index, candidate] of items.entries()) {
      const label = Array.isArray(parsed) ? `${relative}[${String(index)}]` : relative;

      const isQuestionBank =
        typeof candidate === 'object' &&
        candidate !== null &&
        ('skillCode' in candidate || 'stream' in candidate);

      if (isQuestionBank) {
        const result = QuestionSchema.safeParse(candidate);
        if (!result.success) {
          ok = false;
          for (const issue of result.error.issues) {
            const at = issue.path.length > 0 ? issue.path.join('.') : '(root)';
            messages.push(`${label}: ${at} — ${issue.message}`);
          }
          continue;
        }

        itemCount += 1;
        const id = result.data.id;
        const existing = seenItemIds.get(id);
        if (existing) {
          ok = false;
          messages.push(`${label}: duplicate question id ${id} (also in ${existing})`);
        } else {
          seenItemIds.set(id, label);
        }
        continue;
      }

      const result = ItemAuthoringSchema.safeParse(candidate);
      if (!result.success) {
        ok = false;
        for (const issue of result.error.issues) {
          const at = issue.path.length > 0 ? issue.path.join('.') : '(root)';
          messages.push(`${label}: ${at} — ${issue.message}`);
        }
        continue;
      }

      itemCount += 1;
      const existing = seenItemIds.get(result.data.itemId);
      if (existing) {
        ok = false;
        messages.push(`${label}: duplicate itemId ${result.data.itemId} (also in ${existing})`);
      } else {
        seenItemIds.set(result.data.itemId, label);
      }
    }
  }

  return { ok, messages, itemCount };
}
