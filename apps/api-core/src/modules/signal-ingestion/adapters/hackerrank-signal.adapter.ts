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
import { HackerrankApiClient } from '../clients/hackerrank-api.client.js';
import { SignalCircuitOpenError } from '../signal-circuit-breaker.js';
import { assertSafePublicUsername } from '../username.util.js';
import type {
  AdapterFetchContext,
  ConnectValidationResult,
  SignalSourceAdapter,
} from './signal-source.adapter.js';

const CONSENT_SCOPE = 'hackerrank.profile.public';

/**
 * HackerRank passive signal adapter (S6-VB-01).
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class HackerrankSignalAdapter implements SignalSourceAdapter {
  readonly sourceId = 'HACKERRANK' as const;
  readonly supportedConsentScopes = [CONSENT_SCOPE] as const;

  constructor(@Inject(HackerrankApiClient) private readonly client: HackerrankApiClient) {}

  async validateConnectInput(input: ConnectSignalSourceRequest): Promise<ConnectValidationResult> {
    if (!('hackerrankUsername' in input)) {
      throw new BadRequestException({
        error: 'invalid_connect_body',
        message: 'HACKERRANK connect requires hackerrankUsername.',
        statusCode: 400,
      });
    }
    const username = assertSafePublicUsername(input.hackerrankUsername, 'hackerrankUsername');
    const exists = await this.client.probeProfileExists(username);
    if (!exists) {
      throw new NotFoundException({
        error: 'hackerrank_user_not_found',
        message: `No public HackerRank profile found for "${username}".`,
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
        sourceId: 'HACKERRANK',
        externalAccountId: ctx.externalAccountId,
        fetchedAt: new Date().toISOString(),
        consentScope: ctx.consentScope,
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        payload: {
          sourceId: 'HACKERRANK',
          badges: [...profile.badges],
          contestRatings: profile.contestRatings.length ? [...profile.contestRatings] : undefined,
          solvedByTag: [...profile.solvedByTag],
        },
      };
    } catch (error) {
      if (error instanceof SignalCircuitOpenError) {
        throw new ServiceUnavailableException({
          error: 'hackerrank_unavailable',
          message: 'HackerRank is temporarily unavailable. Try again later.',
          statusCode: 503,
        });
      }
      throw error;
    }
  }
}
