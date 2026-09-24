/**
 * Keeps only what a phone number may contain: digits, with a single leading "+".
 * A real `type="number"` input would drop a leading "+" or zero, so phone fields use
 * `type="tel"` with this filter instead.
 */
export function sanitizePhoneInput(value: string): string {
  const hasPlus = value.trimStart().startsWith('+');
  const digits = value.replace(/\D/g, '').slice(0, 15);
  return hasPlus ? `+${digits}` : digits;
}

/** Mirrors the API rule: an optional leading + followed by 8 to 15 digits. */
export function isValidPhone(value: string): boolean {
  return /^\+?[0-9]{8,15}$/.test(value);
}
