import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { InstitutionsTpoController } from './institutions-tpo.controller.js';
import { resolveTenantId } from '../../common/decorators/tenant-id.decorator.js';

const institutionId = randomUUID();
const actorId = randomUUID();
const batchId = randomUUID();
const user = { sub: actorId, inst: institutionId };

function multipartRequest(parts: object[]) {
  return {
    parts: () =>
      (async function* iterator() {
        for (const part of parts) yield part;
      })(),
  };
}

function filePart(buffer = Buffer.from('Student Name,Email Address\nJohn,john@example.test')) {
  return {
    type: 'file',
    filename: 'candidates.csv',
    mimetype: 'text/csv',
    toBuffer: vi.fn().mockResolvedValue(buffer),
  };
}
describe('InstitutionsTpoController import boundary', () => {
  it('retains institution-admin RBAC', () => {
    expect(Reflect.getMetadata(ROLES_KEY, InstitutionsTpoController)).toEqual([
      'INSTITUTION_ADMIN',
    ]);
  });
  it('passes a header probe through the existing import route', async () => {
    const previewBatchImport = vi.fn().mockResolvedValue({
      imported: 0,
      skipped: 0,
      errors: [],
      headers: ['Student Name', 'Email Address'],
    });
    const controller = new InstitutionsTpoController({ previewBatchImport } as never);
    await expect(
      controller.importMembers(
        batchId,
        'true',
        multipartRequest([filePart()]) as never,
        user as never,
        resolveTenantId(user as never),
      ),
    ).resolves.toMatchObject({ headers: ['Student Name', 'Email Address'] });
    expect(previewBatchImport).toHaveBeenCalledWith(
      batchId,
      institutionId,
      expect.any(Buffer),
      'candidates.csv',
      'text/csv',
      undefined,
    );
  });

  it('validates and forwards functional column mapping for import', async () => {
    const importBatchMembers = vi.fn().mockResolvedValue({ imported: 1, skipped: 0, errors: [] });
    const controller = new InstitutionsTpoController({ importBatchMembers } as never);
    const mapping = {
      type: 'field',
      fieldname: 'mapping',
      value: JSON.stringify({ fullName: 'Student Name', email: 'Email Address' }),
    };
    await controller.importMembers(
      batchId,
      undefined,
      multipartRequest([mapping, filePart()]) as never,
      user as never,
      resolveTenantId(user as never),
    );
    expect(importBatchMembers).toHaveBeenCalledWith(
      batchId,
      institutionId,
      expect.any(Buffer),
      'candidates.csv',
      'text/csv',
      actorId,
      { fullName: 'Student Name', email: 'Email Address' },
    );
  });

  it.each([
    [
      [{ type: 'field', fieldname: 'mapping', value: '{bad-json' }, filePart()],
      'Column mapping must be valid JSON.',
    ],
    [[], 'Choose a CSV or XLSX file to upload.'],
  ])('returns a safe 400 response for malformed multipart input', async (parts, message) => {
    const controller = new InstitutionsTpoController({} as never);
    await expect(
      controller.importMembers(
        batchId,
        undefined,
        multipartRequest(parts) as never,
        user as never,
        resolveTenantId(user as never),
      ),
    ).rejects.toMatchObject({ message });
  });

  it('normalizes multipart file-size and stream failures', async () => {
    const brokenFile = filePart();
    brokenFile.toBuffer.mockRejectedValueOnce(new Error('multipart internals'));
    const controller = new InstitutionsTpoController({} as never);
    await expect(
      controller.importMembers(
        batchId,
        undefined,
        multipartRequest([brokenFile]) as never,
        user as never,
        resolveTenantId(user as never),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an administrator without an institution before reading the upload', async () => {
    const controller = new InstitutionsTpoController({} as never);
    await expect(
      (async () =>
        controller.importMembers(
          batchId,
          'true',
          multipartRequest([filePart()]) as never,
          {
            sub: actorId,
          } as never,
          resolveTenantId({
            sub: actorId,
          } as never),
        ))(),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('routes revoke invitation requests to InstitutionsService', async () => {
    const revokeStudentInvitation = vi
      .fn()
      .mockResolvedValue({ invitationId: 'inv-1', status: 'REVOKED' });
    const controller = new InstitutionsTpoController({ revokeStudentInvitation } as never);
    await expect(
      controller.revokeInvitation('inv-1', resolveTenantId(user as never)),
    ).resolves.toEqual({
      invitationId: 'inv-1',
      status: 'REVOKED',
    });
    expect(revokeStudentInvitation).toHaveBeenCalledWith('inv-1', institutionId);
  });
});
