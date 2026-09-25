import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface IdempotentOutcome<T> {
  readonly result: T;
  /** Side effects (email, events) that must only run once, after the transaction commits. */
  readonly afterCommit?: () => Promise<void>;
}

const MAX_KEY_LENGTH = 200;

/**
 * Idempotency-Key ledger for employer mutations. The first request with a key runs and stores its
 * response in the same transaction as the write; a retry with the same key replays that response
 * and repeats nothing. Reusing a key with a different payload is a 409.
 */
@Injectable()
export class IdempotencyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  static requireKey(header: string | undefined): string {
    const key = header?.trim();
    if (!key || key.length > MAX_KEY_LENGTH) {
      throw new BadRequestException({
        error: 'idempotency_key_required',
        message: 'Send an Idempotency-Key header (1–200 characters) with this request.',
        statusCode: 400,
      });
    }
    return key;
  }

  private hashRequest(request: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(request ?? null))
      .digest('hex');
  }

  /** Returns the stored response for a repeated key, or undefined on the first request. */
  async peek<T>(params: {
    userId: string;
    scope: string;
    key: string;
    request: unknown;
  }): Promise<T | undefined> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { userId_scope_key: { userId: params.userId, scope: params.scope, key: params.key } },
    });
    if (!existing) return undefined;
    if (existing.requestHash !== this.hashRequest(params.request)) {
      throw new ConflictException({
        error: 'idempotency_key_reused',
        message: 'This Idempotency-Key was already used with a different request.',
        statusCode: 409,
      });
    }
    return existing.responseBody as T;
  }

  /** Records a response for flows that cannot run inside one transaction (e.g. invite + email). */
  async remember(params: {
    userId: string;
    scope: string;
    key: string;
    request: unknown;
    result: unknown;
  }): Promise<void> {
    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          userId: params.userId,
          scope: params.scope,
          key: params.key,
          requestHash: this.hashRequest(params.request),
          responseBody: (params.result ?? null) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }

  async run<T>(params: {
    userId: string;
    scope: string;
    key: string;
    request: unknown;
    execute: (tx: Prisma.TransactionClient) => Promise<IdempotentOutcome<T>>;
  }): Promise<T> {
    const requestHash = this.hashRequest(params.request);
    const identity = { userId: params.userId, scope: params.scope, key: params.key };

    const replay = async (db: Prisma.TransactionClient | PrismaService): Promise<T | undefined> => {
      const existing = await db.idempotencyRecord.findUnique({
        where: { userId_scope_key: identity },
      });
      if (!existing) return undefined;
      if (existing.requestHash !== requestHash) {
        throw new ConflictException({
          error: 'idempotency_key_reused',
          message: 'This Idempotency-Key was already used with a different request.',
          statusCode: 409,
        });
      }
      return existing.responseBody as T;
    };

    const prior = await replay(this.prisma);
    if (prior !== undefined) return prior;

    let outcome: IdempotentOutcome<T>;
    try {
      outcome = await this.prisma.$transaction(async (tx) => {
        const executed = await params.execute(tx);
        await tx.idempotencyRecord.create({
          data: {
            ...identity,
            requestHash,
            responseBody: (executed.result ?? null) as Prisma.InputJsonValue,
          },
        });
        return executed;
      });
    } catch (error) {
      // A concurrent request with the same key committed first: its transaction wins, ours rolled back.
      if ((error as { code?: string }).code === 'P2002') {
        const raced = await replay(this.prisma);
        if (raced !== undefined) return raced;
      }
      throw error;
    }

    if (outcome.afterCommit) await outcome.afterCommit();
    return outcome.result;
  }
}
