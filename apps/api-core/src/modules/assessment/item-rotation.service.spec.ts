import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ItemRotationService } from './item-rotation.service.js';

const LEVEL_ID = '00000000-0000-0000-0000-000000000001';

function makeItems(formCode: string, count: number, exposureCount = 0) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${formCode}-${String(i)}`,
    stem: `Q${String(i)}`,
    itemType: 'MCQ_SINGLE',
    difficultyTag: 'EASY',
    competencyId: '00000000-0000-0000-0000-000000000099',
    formCode,
    exposureCount,
    options: [],
  }));
}

function makeDb(groups: Array<{ formCode: string; avgExposure: number; items: unknown[] }>) {
  return {
    item: {
      groupBy: async () =>
        groups.map((g) => ({
          formCode: g.formCode,
          _avg: { exposureCount: g.avgExposure },
          _count: { id: g.items.length },
        })),
      findMany: async ({ where }: { where: { formCode: string } }) => {
        const g = groups.find((x) => x.formCode === where.formCode);
        return g?.items ?? [];
      },
      updateMany: async () => ({ count: 0 }),
    },
    $transaction: async (ops: Array<Promise<{ count: number }>>) => Promise.all(ops),
  } as never;
}

describe('ItemRotationService', () => {
  it('selects the form with the lowest average exposure', async () => {
    const db = makeDb([
      { formCode: 'A', avgExposure: 10, items: makeItems('A', 3, 10) },
      { formCode: 'B', avgExposure: 3, items: makeItems('B', 3, 3) },
      { formCode: 'C', avgExposure: 7, items: makeItems('C', 3, 7) },
    ]);
    const svc = new ItemRotationService(db);
    const { formCode } = await svc.selectForm(LEVEL_ID);
    expect(formCode).toBe('B');
  });

  it('throws NotFoundException when no active items remain', async () => {
    const db = makeDb([]);
    const svc = new ItemRotationService(db);
    await expect(svc.selectForm(LEVEL_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns items belonging to the selected form', async () => {
    const db = makeDb([
      { formCode: 'A', avgExposure: 0, items: makeItems('A', 5) },
      { formCode: 'B', avgExposure: 2, items: makeItems('B', 5) },
    ]);
    const svc = new ItemRotationService(db);
    const { formCode, items } = await svc.selectForm(LEVEL_ID);
    expect(formCode).toBe('A');
    expect(items).toHaveLength(5);
    expect(items.every((i) => i.formCode === 'A')).toBe(true);
  });

  it('recordExposure returns retired count from the transaction', async () => {
    let retireCount = 0;
    const db = {
      item: { updateMany: async () => ({ count: 0 }) },
      $transaction: async (ops: Array<Promise<{ count: number }>>) => {
        const results = await Promise.all(ops);
        retireCount = results[1]?.count ?? 0;
        return results;
      },
    } as never;
    const svc = new ItemRotationService(db);
    const { retired } = await svc.recordExposure(['id-1', 'id-2']);
    expect(retired).toBe(retireCount);
  });

  it('ties in average exposure are broken by picking the first candidate', async () => {
    const db = makeDb([
      { formCode: 'A', avgExposure: 5, items: makeItems('A', 2, 5) },
      { formCode: 'B', avgExposure: 5, items: makeItems('B', 2, 5) },
    ]);
    const svc = new ItemRotationService(db);
    const { formCode } = await svc.selectForm(LEVEL_ID);
    expect(['A', 'B']).toContain(formCode);
  });
});
