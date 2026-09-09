import { Injectable } from '@nestjs/common';
import {
  AccredibleAdapter,
  AwsAdapter,
  CredlyAdapter,
  GoogleAdapter,
  MicrosoftAdapter,
  type Tier1Input,
  type Tier1IssuerAdapter,
  type TierVerificationResult,
} from './tier1-issuer-adapter.js';

@Injectable()
export class Tier1IssuerRegistry {
  private readonly adapters: Tier1IssuerAdapter[];

  constructor() {
    this.adapters = [
      new CredlyAdapter(),
      new AccredibleAdapter(),
      new AwsAdapter(),
      new GoogleAdapter(),
      new MicrosoftAdapter(),
    ];
  }

  getAdapter(issuer: string): Tier1IssuerAdapter | null {
    if (!issuer || typeof issuer !== 'string') return null;
    return this.adapters.find((adapter) => adapter.supports(issuer)) ?? null;
  }

  async verify(input: Tier1Input): Promise<TierVerificationResult> {
    const adapter = this.getAdapter(input.issuer);
    if (!adapter) {
      return {
        status: 'UNAVAILABLE',
        tier: 'TIER_1_ISSUER_API',
        confidence: 0,
        reason: `No supported Tier 1 issuer adapter found for issuer "${input.issuer}".`,
      };
    }

    return adapter.verify(input);
  }
}
