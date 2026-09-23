import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ACTIVE_TAXONOMY_VERSION,
  type ConnectSignalSourceRequest,
  type RawSignalEnvelope,
} from '@smart/contracts';
import type {
  AdapterFetchContext,
  ConnectValidationResult,
  SignalSourceAdapter,
} from './signal-source.adapter.js';

const CONSENT_SCOPE = 'credly.badge.public';

/**
 * Credly / Credential Provider passive signal adapter (Th6-I537).
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class CredentialProviderSignalAdapter implements SignalSourceAdapter {
  readonly sourceId = 'CREDLY' as const;
  readonly supportedConsentScopes = [CONSENT_SCOPE] as const;

  async validateConnectInput(input: ConnectSignalSourceRequest): Promise<ConnectValidationResult> {
    if (!('badgeIdOrUrl' in input) || !('providerId' in input)) {
      throw new BadRequestException({
        error: 'invalid_connect_body',
        message: 'CREDLY connect requires providerId and badgeIdOrUrl.',
        statusCode: 400,
      });
    }

    const badgeIdOrUrl = input.badgeIdOrUrl.trim();
    if (!badgeIdOrUrl) {
      throw new BadRequestException({
        error: 'invalid_badge_id',
        message: 'badgeIdOrUrl must not be empty.',
        statusCode: 400,
      });
    }

    return {
      externalAccountId: badgeIdOrUrl,
      consentScope: CONSENT_SCOPE,
      metadata: {
        providerId: input.providerId,
      },
    };
  }

  async fetchRaw(ctx: AdapterFetchContext): Promise<RawSignalEnvelope> {
    const providerId = (ctx.metadata?.providerId as string) ?? 'CREDLY';

    return {
      userId: ctx.userId,
      sourceId: 'CREDLY',
      externalAccountId: ctx.externalAccountId,
      fetchedAt: new Date().toISOString(),
      consentScope: ctx.consentScope,
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      payload: {
        sourceId: 'CREDLY',
        providerId,
        badgeIdOrUrl: ctx.externalAccountId,
      },
    };
  }

  async checkHealth(): Promise<{ reachable: boolean; latencyMs: number }> {
    return { reachable: true, latencyMs: 0 };
  }
}
