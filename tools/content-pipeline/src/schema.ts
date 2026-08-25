import { z } from 'zod';
import {
  DifficultyTagSchema,
  DomainCodeSchema,
  ItemOptionSchema,
  ItemTypeSchema,
  LevelNumberSchema,
  TrackCodeSchema,
  WeightSchema,
} from '@smart/contracts';

/**
 * Item authoring schema — the shape a content author commits as reviewed Git
 * JSON under `tools/content-pipeline/data/**\/*.json` (07-content-data.mdc).
 *
 * This mirrors `ItemInternalDto` from `@smart/contracts` (minus the
 * server-managed `activeFlag`/`exposureCount`) plus the placement fields
 * (`trackCode`, `levelNumber`) an authored item needs before it has a
 * database-assigned `competencyId` relation. Reuses the shared enums so this
 * stays aligned with the catalog DTOs without editing the architect-owned
 * `@smart/contracts` package.
 */
export const ItemAuthoringSchema = z
  .object({
    itemId: z.uuid(),
    trackCode: TrackCodeSchema,
    domainCode: DomainCodeSchema,
    levelNumber: LevelNumberSchema,
    competencyId: z.uuid(),
    itemType: ItemTypeSchema,
    difficulty: DifficultyTagSchema,
    promptText: z.string().min(1),
    options: z.array(ItemOptionSchema).optional(),
    correctOptionIds: z.array(z.string()).optional(),
    expectedNumericAnswer: z.number().optional(),
    numericTolerance: z.number().optional(),
    starterCode: z.string().optional(),
    runtime: z.enum(['node', 'python', 'postgres']).optional(),
    modelAnswer: z.string().optional(),
    checklistCriteria: z
      .array(z.object({ id: z.string(), text: z.string(), points: z.number() }))
      .optional(),
    sandboxTestCases: z
      .array(
        z.object({
          id: z.string(),
          input: z.string(),
          expectedOutput: z.string(),
          hidden: z.boolean(),
        }),
      )
      .optional(),
    maxResponseSeconds: z.number().int().positive().optional(),
    attachmentUrl: z.url().optional(),
    itemWeight: WeightSchema,
  })
  .check((ctx) => {
    const item = ctx.value;
    if (item.itemType === 'MCQ_SINGLE' || item.itemType === 'MCQ_MULTI') {
      if (!item.options || item.options.length < 2) {
        ctx.issues.push({
          code: 'custom',
          message: `${item.itemType} requires at least 2 options`,
          input: item,
          path: ['options'],
        });
      }
      if (!item.correctOptionIds || item.correctOptionIds.length === 0) {
        ctx.issues.push({
          code: 'custom',
          message: `${item.itemType} requires at least one correctOptionIds entry`,
          input: item,
          path: ['correctOptionIds'],
        });
      } else {
        const optionIds = new Set((item.options ?? []).map((option) => option.optionId));
        const unknown = item.correctOptionIds.filter((id) => !optionIds.has(id));
        if (unknown.length > 0) {
          ctx.issues.push({
            code: 'custom',
            message: `correctOptionIds references options not in "options": ${unknown.join(', ')}`,
            input: item,
            path: ['correctOptionIds'],
          });
        }
      }
      if (item.itemType === 'MCQ_SINGLE' && (item.correctOptionIds?.length ?? 0) > 1) {
        ctx.issues.push({
          code: 'custom',
          message: 'MCQ_SINGLE must have exactly one correctOptionIds entry',
          input: item,
          path: ['correctOptionIds'],
        });
      }
    }

    if (item.itemType === 'NUMERIC_ENTRY' && item.expectedNumericAnswer === undefined) {
      ctx.issues.push({
        code: 'custom',
        message: 'NUMERIC_ENTRY requires expectedNumericAnswer',
        input: item,
        path: ['expectedNumericAnswer'],
      });
    }

    if ((item.itemType === 'CODE_TASK' || item.itemType === 'SQL_TASK') && !item.runtime) {
      ctx.issues.push({
        code: 'custom',
        message: `${item.itemType} requires a runtime`,
        input: item,
        path: ['runtime'],
      });
    }

    if (
      (item.itemType === 'SPOKEN_RESPONSE' || item.itemType === 'DEFENSE_PROMPT') &&
      item.maxResponseSeconds === undefined
    ) {
      ctx.issues.push({
        code: 'custom',
        message: `${item.itemType} requires maxResponseSeconds`,
        input: item,
        path: ['maxResponseSeconds'],
      });
    }
  });

export type ItemAuthoring = z.infer<typeof ItemAuthoringSchema>;
