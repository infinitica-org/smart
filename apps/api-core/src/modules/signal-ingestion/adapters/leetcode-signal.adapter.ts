import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ACTIVE_TAXONOMY_VERSION,
  type ConnectSignalSourceRequest,
  type RawSignalEnvelope,
} from '@smart/contracts';
import { LeetcodeStatsClient } from '../clients/leetcode-stats.client.js';
import { SignalCircuitOpenError } from '../signal-circuit-breaker.js';
import { assertSafePublicUsername } from '../username.util.js';
import type {
  AdapterFetchContext,
  ConnectValidationResult,
  SignalSourceAdapter,
} from './signal-source.adapter.js';

const CONSENT_SCOPE = 'leetcode.profile.public';

/**
 * LeetCode passive signal adapter (S6-VB-01).
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class LeetcodeSignalAdapter implements SignalSourceAdapter {
  readonly sourceId = 'LEETCODE' as const;
  readonly supportedConsentScopes = [CONSENT_SCOPE] as const;

  constructor(@Inject(LeetcodeStatsClient) private readonly client: LeetcodeStatsClient) {}

  async validateConnectInput(input: ConnectSignalSourceRequest): Promise<ConnectValidationResult> {
    if (!('leetcodeUsername' in input)) {
      throw new BadRequestException({
        error: 'invalid_connect_body',
        message: 'LEETCODE connect requires leetcodeUsername.',
        statusCode: 400,
      });
    }
    const username = assertSafePublicUsername(input.leetcodeUsername, 'leetcodeUsername');
    try {
      await this.client.fetchProfile(username);
    } catch {
      throw new NotFoundException({
        error: 'leetcode_user_not_found',
        message: `No public LeetCode profile found for "${username}".`,
        statusCode: 404,
      });
    }
    return { externalAccountId: username, consentScope: CONSENT_SCOPE };
  }

  async fetchRaw(ctx: AdapterFetchContext): Promise<RawSignalEnvelope> {
    try {
      const profile = await this.client.fetchProfile(ctx.externalAccountId);
      return {
        userId: ctx.userId,
        sourceId: 'LEETCODE',
        externalAccountId: ctx.externalAccountId,
        fetchedAt: new Date().toISOString(),
        consentScope: ctx.consentScope,
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        payload: {
          sourceId: 'LEETCODE',
          solvedCounts: profile.solvedCounts,
          tagStats: [...profile.tagStats],
          recentActivityDays: profile.recentActivityDays,
        },
      };
    } catch (error) {
      if (error instanceof SignalCircuitOpenError) {
        throw new ServiceUnavailableException({
          error: 'leetcode_unavailable',
          message: 'LeetCode is temporarily unavailable. Try again later.',
          statusCode: 503,
        });
      }
      throw error;
    }
  }
}
