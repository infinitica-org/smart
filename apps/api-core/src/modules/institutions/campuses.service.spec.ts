import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CampusesService, resolveBatchCampus } from './campuses.service.js';

const institutionId = '11111111-1111-4111-8111-111111111111';
const otherInstitutionId = '22222222-2222-4222-8222-222222222222';
const actorId = '33333333-3333-4333-8333-333333333333';
const mainId = '44444444-4444-4444-8444-444444444444';
const northId = '55555555-5555-4555-8555-555555555555';

type Row = {
  id: string;
  institutionId: string;
  name: string;
  code: string | null;
  city: string | null;
  isPrimary: boolean;
  archivedAt: Date | null;
  createdAt: Date;
};

function campus(overrides: Partial<Row> = {}): Row {
  return {
    id: mainId,
    institutionId,
    name: 'Main campus',
    code: null,
    city: null,
    isPrimary: true,
    archivedAt: null,
    createdAt: new Date('2026-09-26T00:00:00.000Z'),
    ...overrides,
  };
}

/** A tiny in-memory campus table, enough for the service's queries. */
function setup(rows: Row[]) {
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => {
      if (key === 'name' && value && typeof value === 'object') {
        return (
          row.name.toLowerCase() === String((value as { equals: string }).equals).toLowerCase()
        );
      }
      return (row as Record<string, unknown>)[key] === value;
    });
  const withCount = (row: Row) => ({ ...row, _count: { batches: 0 } });
  const campusTable = {
    findMany: vi.fn(async ({ where }) => rows.filter((row) => matches(row, where)).map(withCount)),
    findFirst: vi.fn(async ({ where }) => {
      const row = rows.find((candidate) => matches(candidate, where));
      return row ? { ...row } : null;
    }),
    count: vi.fn(async ({ where }) => rows.filter((row) => matches(row, where)).length),
    create: vi.fn(async ({ data }) => {
      const row = campus({ id: northId, ...data });
      rows.push(row);
      return withCount(row);
    }),
    updateMany: vi.fn(async ({ where, data }) => {
      rows.filter((row) => matches(row, where)).forEach((row) => Object.assign(row, data));
      return { count: 1 };
    }),
    update: vi.fn(async ({ where, data }) => {
      const row = rows.find((candidate) => candidate.id === where.id)!;
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) (row as Record<string, unknown>)[key] = value;
      });
      return withCount(row);
    }),
  };
  const prisma = {
    campus: campusTable,
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ campus: campusTable })),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  return { service: new CampusesService(prisma as never, audit as never), prisma, audit, rows };
}

describe('S6-VV-112 campuses', () => {
  it('lists only active campuses, primary first, unless archived ones are asked for', async () => {
    const { service } = setup([
      campus(),
      campus({ id: northId, name: 'North', isPrimary: false, archivedAt: new Date() }),
    ]);

    expect((await service.list(institutionId)).map((row) => row.name)).toEqual(['Main campus']);
    expect(await service.list(institutionId, { includeArchived: true })).toHaveLength(2);
  });

  it('adds a campus as non-primary and audits it', async () => {
    const { service, audit } = setup([campus()]);

    const created = await service.create(institutionId, { name: 'North', city: 'Pune' }, actorId);

    expect(created).toMatchObject({ name: 'North', city: 'Pune', isPrimary: false });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        action: 'institution.campus_created',
        resourceType: 'campus',
      }),
    );
  });

  it('makes the first campus of an institution with none primary', async () => {
    const { service } = setup([]);

    expect((await service.create(institutionId, { name: 'Main' }, actorId)).isPrimary).toBe(true);
  });

  it('rejects a duplicate name, ignoring case', async () => {
    const { service } = setup([campus()]);

    await expect(
      service.create(institutionId, { name: 'main CAMPUS' }, actorId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('moves the primary flag and audits prior and next values', async () => {
    const { service, rows, audit } = setup([
      campus(),
      campus({ id: northId, name: 'North', isPrimary: false }),
    ]);

    await service.update(northId, institutionId, { isPrimary: true }, actorId);

    expect(rows.filter((row) => row.isPrimary).map((row) => row.id)).toEqual([northId]);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'institution.campus_updated',
        metadata: expect.objectContaining({
          prior: expect.objectContaining({ isPrimary: false }),
          next: { isPrimary: true },
        }),
      }),
    );
  });

  it('refuses to archive the primary campus', async () => {
    const { service } = setup([campus()]);

    await expect(
      service.update(mainId, institutionId, { archived: true }, actorId),
    ).rejects.toMatchObject({ response: { error: 'primary_campus' } });
  });

  it('archives and restores a non-primary campus', async () => {
    const { service } = setup([campus(), campus({ id: northId, name: 'North', isPrimary: false })]);

    const archived = await service.update(northId, institutionId, { archived: true }, actorId);
    expect(archived.archivedAt).not.toBeNull();

    const restored = await service.update(northId, institutionId, { archived: false }, actorId);
    expect(restored.archivedAt).toBeNull();
  });

  it("returns 404 for another institution's campus", async () => {
    const { service } = setup([campus({ institutionId: otherInstitutionId })]);

    await expect(
      service.update(mainId, institutionId, { name: 'Renamed' }, actorId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('S6-VV-112 resolveBatchCampus', () => {
  it('defaults a new batch to the primary campus', async () => {
    const { prisma } = setup([campus(), campus({ id: northId, name: 'North', isPrimary: false })]);

    expect(await resolveBatchCampus(prisma as never, institutionId)).toBe(mainId);
  });

  it('accepts an active campus of the same institution', async () => {
    const { prisma } = setup([campus(), campus({ id: northId, name: 'North', isPrimary: false })]);

    expect(await resolveBatchCampus(prisma as never, institutionId, northId)).toBe(northId);
  });

  it('rejects an archived campus and a campus of another institution', async () => {
    const { prisma } = setup([
      campus({ id: northId, name: 'North', isPrimary: false, archivedAt: new Date() }),
      campus({ institutionId: otherInstitutionId }),
    ]);

    await expect(resolveBatchCampus(prisma as never, institutionId, northId)).rejects.toMatchObject(
      {
        response: { error: 'campus_archived' },
      },
    );
    await expect(resolveBatchCampus(prisma as never, institutionId, mainId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('leaves the campus empty for an institution without campuses', async () => {
    const { prisma } = setup([]);

    expect(await resolveBatchCampus(prisma as never, institutionId)).toBeNull();
  });
});
