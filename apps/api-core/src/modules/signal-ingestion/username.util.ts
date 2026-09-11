import { BadRequestException } from '@nestjs/common';

const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,78}[a-zA-Z0-9]?$/;

/** Reject URL schemes, path segments, and @ prefixes for public profile usernames. */
export function assertSafePublicUsername(username: string, field: string): string {
  const trimmed = username.trim();
  if (!trimmed || trimmed.length > 80) {
    throw new BadRequestException({
      error: 'invalid_username',
      message: `${field} must be 1–80 characters.`,
      statusCode: 400,
    });
  }
  if (/[@/:\\]/.test(trimmed) || /^https?:/i.test(trimmed)) {
    throw new BadRequestException({
      error: 'invalid_username',
      message: `${field} must be a plain username, not a URL.`,
      statusCode: 400,
    });
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    throw new BadRequestException({
      error: 'invalid_username',
      message: `${field} contains invalid characters.`,
      statusCode: 400,
    });
  }
  return trimmed;
}

/** Hostname allowlist check for SSRF defence. */
export function assertAllowedHostname(url: URL, allowedHosts: readonly string[]): void {
  const host = url.hostname.toLowerCase();
  const ok = allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  if (!ok) {
    throw new BadRequestException({
      error: 'disallowed_host',
      message: 'URL host is not allowlisted for this signal source.',
      statusCode: 400,
    });
  }
}
