/**
 * Extract plain text for POST /users/me/resume/parse (`rawText`).
 * Supports PDF (.pdf), Word (.docx, .doc), and Plain Text (.txt) files.
 */
export async function extractResumeRawText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const lower = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx');
  const isDoc = file.type === 'application/msword' || lower.endsWith('.doc');

  if (isDoc) {
    throw new Error(
      'Legacy Word (.doc) format is not supported directly. Please convert your resume to .docx, .pdf, or .txt format.',
    );
  }

  if (isPdf) {
    const textFromPdf = await extractPdfText(buffer);
    if (textFromPdf.length >= 40) return textFromPdf;
  } else if (isDocx) {
    const textFromDocx = await extractDocxText(buffer);
    if (textFromDocx.length >= 40) return textFromDocx;
  }

  // Fallback to plain text decoder or printable runs
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const cleaned = Array.from(decoded)
    .filter((ch) => ch.charCodeAt(0) !== 0)
    .join('')
    .trim();

  if (cleaned.length >= 40 && !isPdf && !isDocx) return cleaned;

  const printableRuns = extractPrintableRuns(decoded);
  if (printableRuns.length >= 40) return printableRuns;

  throw new Error(
    'Could not read enough text from this file. Try another file or enter details manually.',
  );
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const latinStr = new TextDecoder('latin1').decode(bytes);
  const cmapDict: Record<string, string> = {};
  const decompressedStreams: string[] = [];

  let pos = 0;
  while (pos < latinStr.length) {
    const streamIdx = latinStr.indexOf('stream', pos);
    if (streamIdx === -1) break;

    const endStreamIdx = latinStr.indexOf('endstream', streamIdx);
    if (endStreamIdx === -1) break;

    let startData = streamIdx + 6;
    if (latinStr[startData] === '\r') startData++;
    if (latinStr[startData] === '\n') startData++;

    let endData = endStreamIdx;
    if (latinStr[endData - 1] === '\n') endData--;
    if (latinStr[endData - 1] === '\r') endData--;

    if (startData < endData) {
      let streamBytes = bytes.subarray(startData, endData);
      const headerSnippet = latinStr.slice(Math.max(0, streamIdx - 150), streamIdx);
      const isAscii85 =
        headerSnippet.includes('85Decode') ||
        latinStr.slice(startData, startData + 10).includes('<~');

      if (isAscii85) {
        const asciiStr = new TextDecoder('latin1').decode(streamBytes);
        streamBytes = new Uint8Array(decodeASCII85(asciiStr));
      }

      const decompressedBuf = await decompressStreamBytes(streamBytes);
      if (decompressedBuf) {
        decompressedStreams.push(
          new TextDecoder('utf-8', { fatal: false }).decode(decompressedBuf),
        );
      }
    }
    pos = endStreamIdx + 9;
  }

  for (const decompressedStr of decompressedStreams) {
    if (decompressedStr.includes('/CIDInit') || decompressedStr.includes('begincmap')) {
      Object.assign(cmapDict, parseCMapStream(decompressedStr));
    }
  }

  let extractedText = '';

  for (const decompressedStr of decompressedStreams) {
    const lines = decompressedStr.split('\n');
    for (const line of lines) {
      const tokens = [
        ...line.matchAll(/<([0-9a-fA-F]+)>\s*T[jJ]|\[([\s\S]*?)\]\s*TJ|\((.*?)\)\s*T[jJ]/g),
      ];
      for (const [, singleHex, tjArray, plainTj] of tokens) {
        if (singleHex) {
          extractedText += decodeHexToken(singleHex, cmapDict);
        } else if (tjArray) {
          const hexes = [...tjArray.matchAll(/<([0-9a-fA-F]+)>/g)];
          for (const [, hexGroup] of hexes) {
            if (hexGroup) {
              extractedText += decodeHexToken(hexGroup, cmapDict);
            }
          }
          const plainStrings = [...tjArray.matchAll(/\((.*?)\)/g)];
          for (const [, pStr] of plainStrings) {
            if (pStr) {
              extractedText += pStr.replace(/\\\\/g, '\\') + ' ';
            }
          }
        } else if (plainTj) {
          extractedText += plainTj.replace(/\\\\/g, '\\') + ' ';
        }
      }
      if (tokens.length > 0) extractedText += ' ';
    }
  }

  return extractedText
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHexToken(hexToken: string, cmapDict: Record<string, string>): string {
  let out = '';
  for (let i = 0; i < hexToken.length; i += 4) {
    const hex4 = hexToken
      .slice(i, i + 4)
      .padStart(4, '0')
      .toLowerCase();
    if (cmapDict[hex4]) {
      out += cmapDict[hex4];
      continue;
    }
    const val4 = parseInt(hex4, 16);
    if (val4 >= 32 && val4 <= 126) {
      out += String.fromCharCode(val4);
      continue;
    }
    const hex2a = hexToken.slice(i, i + 2);
    const hex2b = hexToken.slice(i + 2, i + 4);
    const val2a = parseInt(hex2a, 16);
    const val2b = parseInt(hex2b, 16);
    if (val2a >= 32 && val2a <= 126) out += String.fromCharCode(val2a);
    if (val2b >= 32 && val2b <= 126) out += String.fromCharCode(val2b);
  }
  return out;
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const latinStr = new TextDecoder('latin1').decode(bytes);

  const docXmlIdx = latinStr.indexOf('word/document.xml');
  if (docXmlIdx === -1) return '';

  const pkIdx = latinStr.lastIndexOf('PK\x03\x04', docXmlIdx);
  if (pkIdx === -1 || pkIdx + 30 > bytes.length) return '';

  const b8 = bytes[pkIdx + 8] ?? 0;
  const b9 = bytes[pkIdx + 9] ?? 0;
  const b18 = bytes[pkIdx + 18] ?? 0;
  const b19 = bytes[pkIdx + 19] ?? 0;
  const b20 = bytes[pkIdx + 20] ?? 0;
  const b21 = bytes[pkIdx + 21] ?? 0;
  const b26 = bytes[pkIdx + 26] ?? 0;
  const b27 = bytes[pkIdx + 27] ?? 0;
  const b28 = bytes[pkIdx + 28] ?? 0;
  const b29 = bytes[pkIdx + 29] ?? 0;

  const compMethod = b8 | (b9 << 8);
  const compSize = b18 | (b19 << 8) | (b20 << 16) | (b21 << 24);
  const fnLen = b26 | (b27 << 8);
  const extraLen = b28 | (b29 << 8);

  const dataStart = pkIdx + 30 + fnLen + extraLen;
  if (dataStart + compSize > bytes.length) return '';

  const docXmlBytes = bytes.subarray(dataStart, dataStart + compSize);

  let xmlStr = '';
  if (compMethod === 8) {
    const decompressed = await decompressStreamBytes(docXmlBytes, true);
    if (decompressed) {
      xmlStr = new TextDecoder('utf-8', { fatal: false }).decode(decompressed);
    }
  } else {
    xmlStr = new TextDecoder('utf-8', { fatal: false }).decode(docXmlBytes);
  }

  if (!xmlStr) return '';

  const textMatches = [...xmlStr.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
  const paragraphText = textMatches.map((m) => m[1] ?? '').join(' ');
  return paragraphText
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function decompressStreamBytes(
  bytes: Uint8Array,
  rawDeflate = false,
): Promise<Uint8Array | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const zlib = require('zlib');
    const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decomp = rawDeflate ? zlib.inflateRawSync(buf) : zlib.inflateSync(buf);
    return new Uint8Array(decomp.buffer, decomp.byteOffset, decomp.byteLength);
  } catch {
    // Fallback to browser DecompressionStream
  }

  try {
    if (typeof DecompressionStream !== 'undefined') {
      const format = rawDeflate ? 'deflate-raw' : 'deflate';
      const ds = new DecompressionStream(format as CompressionFormat);
      const writer = ds.writable.getWriter();
      const inputCopy = new Uint8Array(bytes);
      await writer.write(inputCopy);
      await writer.close();

      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLength += value.length;
        }
      }
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    }
  } catch {
    return null;
  }
  return null;
}

function parseCMapStream(decompressedStr: string): Record<string, string> {
  const cmapDict: Record<string, string> = {};
  const charMatches = [...decompressedStr.matchAll(/<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/g)];
  for (const [, code, ucode] of charMatches) {
    if (!code || !ucode) continue;
    try {
      const hexes = ucode.match(/.{1,4}/g) || [];
      const charStr = String.fromCharCode(...hexes.map((h) => parseInt(h, 16)));
      cmapDict[code.padStart(4, '0').toLowerCase()] = charStr;
    } catch {
      // Ignore invalid character mappings
    }
  }
  const rangeMatches = [
    ...decompressedStr.matchAll(/<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/g),
  ];
  for (const [, start, end, ustart] of rangeMatches) {
    if (!start || !end || !ustart) continue;
    try {
      const s = parseInt(start, 16);
      const e = parseInt(end, 16);
      const u = parseInt(ustart, 16);
      for (let i = s; i <= e; i++) {
        const key = i.toString(16).padStart(4, '0').toLowerCase();
        cmapDict[key] = String.fromCharCode(u + (i - s));
      }
    } catch {
      // Ignore invalid ranges
    }
  }
  return cmapDict;
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

function decodeASCII85(str: string): Uint8Array {
  let clean = str.replace(/\s/g, '');
  if (clean.endsWith('~>')) clean = clean.slice(0, -2);
  if (clean.startsWith('<~')) clean = clean.slice(2);

  const out: number[] = [];
  let i = 0;
  while (i < clean.length) {
    if (clean[i] === 'z') {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    const chunk = clean.slice(i, i + 5);
    i += 5;
    let val = 0;
    for (let j = 0; j < 5; j++) {
      const code = j < chunk.length ? (chunk.charCodeAt(j) ?? 33) - 33 : 84;
      val = val * 85 + code;
    }
    const b1 = (val >>> 24) & 0xff;
    const b2 = (val >>> 16) & 0xff;
    const b3 = (val >>> 8) & 0xff;
    const b4 = val & 0xff;

    const bytesToAdd = Math.min(4, chunk.length - 1);
    if (bytesToAdd >= 1) out.push(b1);
    if (bytesToAdd >= 2) out.push(b2);
    if (bytesToAdd >= 3) out.push(b3);
    if (bytesToAdd >= 4) out.push(b4);
  }
  return new Uint8Array(out);
}
