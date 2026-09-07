import { describe, expect, it } from 'vitest';
import { AiGatewayAuditService, lookupModelPricing } from './ai-gateway-audit.service.js';

describe('lookupModelPricing', () => {
  it('uses OpenRouter Gemini 2.5 Flash list prices', () => {
    expect(lookupModelPricing('google/gemini-2.5-flash')).toEqual({
      promptPerMillion: 0.3,
      completionPerMillion: 2.5,
    });
    expect(lookupModelPricing('google/gemini-2.5-flash:google')).toEqual({
      promptPerMillion: 0.3,
      completionPerMillion: 2.5,
    });
  });

  it('estimates a typical skill-form pair under a tenth of a cent', () => {
    const audit = new AiGatewayAuditService();
    const closed = audit.estimateCostUsd('google/gemini-2.5-flash', 350, 900);
    const open = audit.estimateCostUsd('google/gemini-2.5-flash', 480, 1_800);
    expect(closed + open).toBeLessThan(0.01);
  });
});
