import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlockedWordsAdminService } from './blocked-words-admin.service.js';

describe('BlockedWordsAdminService (CN-T09)', () => {
  let prisma: any;
  let auditPublisher: any;
  let service: BlockedWordsAdminService;

  const actorId = randomUUID();

  beforeEach(() => {
    prisma = {
      blockedWord: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };
    auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
    service = new BlockedWordsAdminService(prisma, auditPublisher);
  });

  it('normalizes and creates a new blocked word, and audits the action', async () => {
    const created = { id: randomUUID(), word: 'admin', createdAt: new Date('2026-09-01T00:00:00.000Z') };
    prisma.blockedWord.create.mockResolvedValue(created);

    const result = await service.create(actorId, { word: '  Admin  ' });

    expect(prisma.blockedWord.create).toHaveBeenCalledWith({ data: { word: 'admin' } });
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId, action: 'blocked_word.created' }),
    );
    expect(result.word).toBe('admin');
  });

  it('rejects a duplicate word (already normalized-equal) with a clear conflict', async () => {
    prisma.blockedWord.findUnique.mockResolvedValue({ id: randomUUID(), word: 'admin' });
    await expect(service.create(actorId, { word: 'ADMIN' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.blockedWord.create).not.toHaveBeenCalled();
  });

  it('removing a word writes an audit row with the removed word in metadata', async () => {
    const id = randomUUID();
    prisma.blockedWord.findUnique.mockResolvedValue({ id, word: 'blocked-term' });

    await service.remove(actorId, id);

    expect(prisma.blockedWord.delete).toHaveBeenCalledWith({ where: { id } });
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        action: 'blocked_word.removed',
        metadata: { word: 'blocked-term' },
      }),
    );
  });

  it('removing a non-existent word is a silent no-op (no audit row)', async () => {
    prisma.blockedWord.findUnique.mockResolvedValue(null);
    await service.remove(actorId, randomUUID());
    expect(prisma.blockedWord.delete).not.toHaveBeenCalled();
    expect(auditPublisher.record).not.toHaveBeenCalled();
  });
});
