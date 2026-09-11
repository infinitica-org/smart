import { Inject, Injectable, Optional } from '@nestjs/common';
import { StorageService } from '../../../platform/storage/storage.service.js';
import type { TierVerificationResult } from './tier1-issuer-adapter.js';

export interface Tier3Input {
  certificateFileUrl?: string | null;
  candidateName?: string | null;
  title: string;
  issuer: string;
  certificateNumber?: string | null;
  verificationUrl?: string | null;
  extractedTextOverride?: string | null; // For unit test overriding
}

@Injectable()
export class Tier3OcrVerifier {
  constructor(
    @Optional() @Inject(StorageService) private readonly storageService?: StorageService,
  ) {}

  async verify(input: Tier3Input): Promise<TierVerificationResult> {
    const fileUrl = input.certificateFileUrl?.trim();
    if (!fileUrl && !input.extractedTextOverride) {
      return {
        status: 'UNAVAILABLE',
        tier: 'TIER_3_OCR_HEURISTIC',
        confidence: 0,
        reason: 'No certificate file URL attached for OCR analysis.',
      };
    }

    let rawText = '';
    if (input.extractedTextOverride) {
      rawText = input.extractedTextOverride.trim();
    } else if (fileUrl) {
      try {
        const buffer = await this.retrieveBuffer(fileUrl);
        rawText = this.extractPrintableText(buffer);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          status: 'AMBIGUOUS',
          tier: 'TIER_3_OCR_HEURISTIC',
          confidence: 0.3,
          reason: `Could not read certificate file for OCR extraction: ${message}.`,
        };
      }
    }

    if (!rawText || rawText.length < 15) {
      return {
        status: 'AMBIGUOUS',
        tier: 'TIER_3_OCR_HEURISTIC',
        confidence: 0.3,
        reason: 'Extracted OCR text was empty or insufficient (< 15 characters).',
      };
    }

    const normText = rawText.toLowerCase();
    const normCandidateName = input.candidateName ? input.candidateName.toLowerCase().trim() : '';
    const normTitle = input.title.toLowerCase().trim();
    const normIssuer = input.issuer.toLowerCase().trim();
    const normCertNumber = input.certificateNumber
      ? input.certificateNumber.toLowerCase().trim()
      : '';

    const candidateMatch = normCandidateName ? normText.includes(normCandidateName) : false;
    const titleMatch = normText.includes(normTitle);
    const issuerMatch = normText.includes(normIssuer);
    const certNumberMatch = normCertNumber ? normText.includes(normCertNumber) : false;

    // Calculate heuristic confidence score
    let score = 0;
    if (candidateMatch) score += 0.4;
    if (titleMatch) score += 0.3;
    if (issuerMatch) score += 0.2;
    if (certNumberMatch) score += 0.1;

    // Conservative heuristic: Auto-verify ONLY if confidence >= 0.85 (Candidate name MUST match)
    if (candidateMatch && (titleMatch || issuerMatch || certNumberMatch) && score >= 0.85) {
      return {
        status: 'VERIFIED',
        tier: 'TIER_3_OCR_HEURISTIC',
        confidence: score,
        reason: `OCR document analysis verified candidate name and certificate metadata (confidence score: ${score.toFixed(2)}).`,
        metadata: {
          candidateMatch,
          titleMatch,
          issuerMatch,
          certNumberMatch,
          score,
        },
      };
    }

    // Completely contradictory (no name match AND no title/issuer match) -> FAILED
    if (!candidateMatch && !titleMatch && !issuerMatch && !certNumberMatch) {
      return {
        status: 'FAILED',
        tier: 'TIER_3_OCR_HEURISTIC',
        confidence: 0.85,
        reason:
          'OCR document analysis failed: None of candidate name, certificate title, issuer, or certificate number were found in document.',
      };
    }

    // Partial match or candidate name missing -> AMBIGUOUS (Needs manual review / stays PENDING)
    return {
      status: 'AMBIGUOUS',
      tier: 'TIER_3_OCR_HEURISTIC',
      confidence: score,
      reason: `OCR document analysis produced partial match (Candidate name match: ${candidateMatch}, Score: ${score.toFixed(2)}). Flagged for manual review.`,
      metadata: {
        candidateMatch,
        titleMatch,
        issuerMatch,
        certNumberMatch,
        score,
      },
    };
  }

  private async retrieveBuffer(fileUrl: string): Promise<Buffer> {
    if (fileUrl.startsWith('data:')) {
      const parts = fileUrl.split(',');
      const base64Data = parts[1];
      if (!base64Data) throw new Error('Malformed data URI');
      return Buffer.from(base64Data, 'base64');
    }

    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    }

    if (this.storageService) {
      try {
        return await this.storageService.getObjectBuffer(fileUrl);
      } catch {
        // Fall through to fs
      }
    }

    const fs = await import('node:fs/promises');
    return fs.readFile(fileUrl);
  }

  private extractPrintableText(buffer: Buffer): string {
    const raw = buffer.toString('utf-8');
    const runs: string[] = [];
    let current = '';
    for (let i = 0; i < raw.length; i++) {
      const code = raw.charCodeAt(i);
      const printable = code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
      if (printable) {
        current += raw[i];
      } else if (current.length >= 3) {
        runs.push(current.trim());
        current = '';
      } else {
        current = '';
      }
    }
    if (current.length >= 3) runs.push(current.trim());
    return runs.join(' ').replace(/\s+/g, ' ').trim();
  }
}
