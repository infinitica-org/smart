import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  extractCitations,
  validateCitation,
  validateExplanationCitations,
} from './citation-validator.js';

describe('SEC-02 / I569: Citation Validator', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('extractCitations', () => {
    it('extracts unique HTTP/HTTPS URLs from explanation prose', () => {
      const text =
        'The candidate demonstrated strong SQL capability as shown in https://evidence.smart.infinitica.io/artifacts/123.pdf and also verified via https://github.com/candidate/repo. Duplicate reference https://evidence.smart.infinitica.io/artifacts/123.pdf should be deduplicated.';
      const urls = extractCitations(text);
      expect(urls).toEqual([
        'https://evidence.smart.infinitica.io/artifacts/123.pdf',
        'https://github.com/candidate/repo',
      ]);
    });

    it('returns empty array when text has no citations', () => {
      expect(extractCitations('No citations in this text.')).toEqual([]);
      expect(extractCitations('')).toEqual([]);
    });
  });

  describe('validateCitation', () => {
    it('returns valid true when HEAD request returns 200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      } as unknown as Response);

      const result = await validateCitation(
        'https://evidence.smart.infinitica.io/artifacts/123.pdf',
      );
      expect(result.isValid).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://evidence.smart.infinitica.io/artifacts/123.pdf',
        expect.objectContaining({ method: 'HEAD' }),
      );
    });

    it('returns valid false when HEAD request returns 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
      } as unknown as Response);

      const result = await validateCitation(
        'https://evidence.smart.infinitica.io/artifacts/missing.pdf',
      );
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(404);
    });

    it('returns valid false on network failure or exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await validateCitation('https://broken.domain.com/evidence');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Connection refused');
    });

    it('rejects unsupported non-HTTP protocols', async () => {
      const result = await validateCitation('ftp://evidence.org/file.txt');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid protocol');
    });
  });

  describe('validateExplanationCitations', () => {
    it('validates all extracted citations and determines overall validity', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ status: 200 } as unknown as Response)
        .mockResolvedValueOnce({ status: 200 } as unknown as Response);

      const text =
        'Observed proof at https://smart.platform/evidence/1 and secondary at https://smart.platform/evidence/2.';
      const res = await validateExplanationCitations(text);

      expect(res.allValid).toBe(true);
      expect(res.results).toHaveLength(2);
    });

    it('flags allValid false if any citation is broken', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ status: 200 } as unknown as Response)
        .mockResolvedValueOnce({ status: 404 } as unknown as Response);

      const text =
        'Good evidence at https://smart.platform/evidence/1 but missing at https://smart.platform/evidence/404.';
      const res = await validateExplanationCitations(text);

      expect(res.allValid).toBe(false);
      expect(res.results[0]?.isValid).toBe(true);
      expect(res.results[1]?.isValid).toBe(false);
    });

    it('returns allValid true when there are no citations to check', async () => {
      const res = await validateExplanationCitations('Plain explanation with no links.');
      expect(res.allValid).toBe(true);
      expect(res.results).toEqual([]);
    });
  });
});
