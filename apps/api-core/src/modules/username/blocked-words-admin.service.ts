import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { CreateBlockedWordRequest, ListBlockedWordsResponse } from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

function normalizeWord(raw: string): string {
  return raw.trim().toLowerCase();
}

/** CN-T09 — super-admin-curated blocked-word list backing `UsernameService.isBlocked`. */
@Injectable()
export class BlockedWordsAdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async list(): Promise<ListBlockedWordsResponse> {
    const rows = await this.prisma.blockedWord.findMany({ orderBy: { word: 'asc' } });
    return {
      words: rows.map((row) => ({
        id: row.id,
        word: row.word,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async create(actorId: string, body: CreateBlockedWordRequest) {
    const word = normalizeWord(body.word);
    const existing = await this.prisma.blockedWord.findUnique({ where: { word } });
    if (existing) {
      throw new ConflictException({
        error: 'conflict',
        message: 'That word is already on the blocked list.',
        statusCode: 409,
      });
    }

    const created = await this.prisma.blockedWord.create({ data: { word } });

    await this.auditPublisher.record({
      actorId,
      action: 'blocked_word.created',
      resourceType: 'blocked_word',
      resourceId: created.id,
      reasonCode: null,
      metadata: { word },
    });

    return { id: created.id, word: created.word, createdAt: created.createdAt.toISOString() };
  }

  async remove(actorId: string, id: string): Promise<void> {
    const existing = await this.prisma.blockedWord.findUnique({ where: { id } });
    if (!existing) return;

    await this.prisma.blockedWord.delete({ where: { id } });

    await this.auditPublisher.record({
      actorId,
      action: 'blocked_word.removed',
      resourceType: 'blocked_word',
      resourceId: id,
      reasonCode: null,
      metadata: { word: existing.word },
    });
  }
}
