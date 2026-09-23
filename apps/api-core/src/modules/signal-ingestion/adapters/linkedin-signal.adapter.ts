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

const CONSENT_SCOPE = 'linkedin.profile.public';

/**
 * LinkedIn passive signal adapter (Th6-I539).
 *
 * Imports profile sections (work history, education, skills, certifications)
 * and stages imported claims with verificationStatus = 'UNVERIFIED' (Th6-I540).
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class LinkedinSignalAdapter implements SignalSourceAdapter {
  readonly sourceId = 'LINKEDIN' as const;
  readonly supportedConsentScopes = [CONSENT_SCOPE] as const;

  async validateConnectInput(input: ConnectSignalSourceRequest): Promise<ConnectValidationResult> {
    if (!('linkedinUrl' in input)) {
      throw new BadRequestException({
        error: 'invalid_connect_body',
        message: 'LINKEDIN connect requires linkedinUrl.',
        statusCode: 400,
      });
    }

    const url = input.linkedinUrl.trim();
    if (!url.includes('linkedin.com/')) {
      throw new BadRequestException({
        error: 'invalid_linkedin_url',
        message: 'That does not look like a valid LinkedIn profile URL.',
        statusCode: 400,
      });
    }

    const importedSections = input.importedSections ?? [
      'workHistory',
      'education',
      'skills',
      'certifications',
    ];

    return {
      externalAccountId: url,
      consentScope: CONSENT_SCOPE,
      metadata: {
        importedSections,
      },
    };
  }

  async fetchRaw(ctx: AdapterFetchContext): Promise<RawSignalEnvelope> {
    const importedSections = (ctx.metadata?.importedSections as Array<
      'workHistory' | 'education' | 'skills' | 'certifications'
    >) ?? ['workHistory', 'education', 'skills', 'certifications'];

    return {
      userId: ctx.userId,
      sourceId: 'LINKEDIN',
      externalAccountId: ctx.externalAccountId,
      fetchedAt: new Date().toISOString(),
      consentScope: ctx.consentScope,
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      payload: {
        sourceId: 'LINKEDIN',
        linkedinUrl: ctx.externalAccountId,
        importedSections,
        verificationStatus: 'UNVERIFIED',
      },
    };
  }

  async checkHealth(): Promise<{ reachable: boolean; latencyMs: number }> {
    return { reachable: true, latencyMs: 0 };
  }
}
