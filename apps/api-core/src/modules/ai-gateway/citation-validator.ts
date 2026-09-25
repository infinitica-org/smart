/**
 * SEC-02 / Th6-I569: Citation validation for AI-generated explanations.
 * Validates that cited stored evidence URLs/refs are accessible and non-broken.
 */

export interface CitationValidationResult {
  url: string;
  isValid: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Validates an individual URL citation using an HTTP HEAD request with timeout.
 * Returns true if the URL returns a 2xx or 3xx status code.
 */
export async function validateCitation(
  url: string,
  timeoutMs = 3000,
): Promise<CitationValidationResult> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        url,
        isValid: false,
        error: 'Invalid protocol: only http and https are supported',
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      const isValid = response.status >= 200 && response.status < 400;
      return {
        url,
        isValid,
        statusCode: response.status,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return {
      url,
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Regex to extract URLs from AI explanation text.
 */
const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:?!)]/gi;

/**
 * Extracts all valid HTTP/HTTPS URLs cited in an AI explanation text string.
 */
export function extractCitations(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

/**
 * Validates all citations present in an AI explanation text.
 */
export async function validateExplanationCitations(
  text: string,
  timeoutMs = 3000,
): Promise<{
  allValid: boolean;
  results: CitationValidationResult[];
}> {
  const citations = extractCitations(text);
  if (citations.length === 0) {
    return { allValid: true, results: [] };
  }

  const results = await Promise.all(citations.map((url) => validateCitation(url, timeoutMs)));
  const allValid = results.every((r) => r.isValid);

  return { allValid, results };
}
