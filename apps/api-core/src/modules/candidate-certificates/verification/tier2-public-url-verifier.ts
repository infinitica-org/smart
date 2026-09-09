import { Injectable } from '@nestjs/common';
import type { TierVerificationResult } from './tier1-issuer-adapter.js';

export interface Tier2Input {
  verificationUrl?: string | null;
  candidateName?: string | null;
  title: string;
  issuer: string;
  certificateNumber?: string | null;
  rawHtmlOverride?: string | null; // Used for deterministic testing
}

@Injectable()
export class Tier2PublicUrlVerifier {
  private readonly DEFAULT_TIMEOUT_MS = 5_000;

  async verify(input: Tier2Input): Promise<TierVerificationResult> {
    const url = input.verificationUrl?.trim();
    if (!url) {
      return {
        status: 'UNAVAILABLE',
        tier: 'TIER_2_PUBLIC_URL',
        confidence: 0,
        reason: 'No public verification URL supplied.',
      };
    }

    if (!this.isValidPublicUrl(url)) {
      return {
        status: 'FAILED',
        tier: 'TIER_2_PUBLIC_URL',
        confidence: 1.0,
        reason: `Invalid or untrusted verification URL: ${url}. URL must be an absolute http or https link.`,
      };
    }

    let pageText = '';
    if (input.rawHtmlOverride) {
      pageText = this.stripHtml(input.rawHtmlOverride);
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT_MS);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'SMART-Certificate-Verifier/1.0',
            Accept: 'text/html,application/xhtml+xml,text/plain',
          },
          redirect: 'follow',
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            status: 'FAILED',
            tier: 'TIER_2_PUBLIC_URL',
            confidence: 0.9,
            reason: `Verification URL fetch failed with HTTP status ${response.status}.`,
          };
        }

        const html = await response.text();
        pageText = this.stripHtml(html);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          status: 'AMBIGUOUS',
          tier: 'TIER_2_PUBLIC_URL',
          confidence: 0.2,
          reason: `Failed to fetch public verification URL: ${message}.`,
        };
      }
    }

    if (!pageText || pageText.length < 20) {
      return {
        status: 'AMBIGUOUS',
        tier: 'TIER_2_PUBLIC_URL',
        confidence: 0.3,
        reason: 'Verification page retrieved empty or insufficient content.',
      };
    }

    const normPageText = pageText.toLowerCase();
    const normCandidateName = input.candidateName ? input.candidateName.toLowerCase().trim() : '';
    const normTitle = input.title.toLowerCase().trim();
    const normIssuer = input.issuer.toLowerCase().trim();
    const normCertNumber = input.certificateNumber
      ? input.certificateNumber.toLowerCase().trim()
      : '';

    const candidateMatch = normCandidateName ? normPageText.includes(normCandidateName) : false;
    const certNumberMatch = normCertNumber ? normPageText.includes(normCertNumber) : false;
    const titleMatch = normPageText.includes(normTitle);
    const issuerMatch = normPageText.includes(normIssuer);

    // Strict positive match: must match candidate name AND (cert number OR title/issuer)
    if (candidateMatch && (certNumberMatch || titleMatch || issuerMatch)) {
      return {
        status: 'VERIFIED',
        tier: 'TIER_2_PUBLIC_URL',
        confidence: certNumberMatch ? 0.95 : 0.85,
        reason: `Verification page successfully validated candidate name "${input.candidateName}" and certificate details.`,
        metadata: {
          url,
          candidateMatch,
          certNumberMatch,
          titleMatch,
          issuerMatch,
        },
      };
    }

    // Contradictory text or missing critical match details -> Ambiguous (needs Super Admin review)
    if (normPageText.length > 50) {
      return {
        status: 'AMBIGUOUS',
        tier: 'TIER_2_PUBLIC_URL',
        confidence: 0.5,
        reason: `Verification page retrieved but failed strict matching (Candidate match: ${candidateMatch}, Cert# match: ${certNumberMatch}, Title match: ${titleMatch}). Flagged for review.`,
        metadata: {
          url,
          candidateMatch,
          certNumberMatch,
          titleMatch,
          issuerMatch,
        },
      };
    }

    return {
      status: 'FAILED',
      tier: 'TIER_2_PUBLIC_URL',
      confidence: 0.8,
      reason: `Verification page content did not validate certificate payload.`,
    };
  }

  private isValidPublicUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      // Basic SSRF defense: block localhost & private IP addresses
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local')
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
