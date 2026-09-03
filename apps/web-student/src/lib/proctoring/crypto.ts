export function isProctoringEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PROCTORING_FULL !== 'false';
}

export async function signProctoringEvent(
  secret: string,
  attemptId: string,
  nonce: string,
  kind: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${attemptId}:${nonce}:${kind}`),
  );
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function deviceFingerprintHash(): string {
  const raw = [
    navigator.userAgent,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? 0),
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return hash.toString(16).padStart(16, '0').repeat(4).slice(0, 64);
}
