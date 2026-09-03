/**
 * Extract plain text for POST /users/me/resume/parse (`rawText`).
 * Object storage (`objectKey`) is not wired yet — text extraction is required.
 */
export async function extractResumeRawText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const lower = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');

  if (isPdf) {
    const fromPdf = extractPrintableRuns(decoded);
    if (fromPdf.length >= 40) return fromPdf;
    throw new Error(
      'Could not read enough text from this PDF. Try another file or enter details manually.',
    );
  }

  const cleaned = Array.from(decoded)
    .filter((ch) => ch.charCodeAt(0) !== 0)
    .join('')
    .trim();
  if (cleaned.length >= 40) return cleaned;

  throw new Error(
    'Could not read enough text from this file. Try another file or enter details manually.',
  );
}

function extractPrintableRuns(raw: string): string {
  const runs: string[] = [];
  let current = '';
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    const printable = code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
    if (printable) {
      current += ch;
    } else if (current.length >= 4) {
      runs.push(current.trim());
      current = '';
    } else {
      current = '';
    }
  }
  if (current.length >= 4) runs.push(current.trim());
  return runs.join(' ').replace(/\s+/g, ' ').trim();
}
