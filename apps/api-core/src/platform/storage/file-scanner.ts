import { connect } from 'node:net';
import { Logger, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { fileScansTotal } from '@smart/observability';
import { env } from '../config/env.js';

export type ScanResult = { clean: true } | { clean: false; signature: string };

const CHUNK_BYTES = 64 * 1024;
const logger = new Logger('FileScanner');

/**
 * Streams `buffer` to clamd with the INSTREAM command: `zINSTREAM\0`, then chunks each prefixed with
 * a 4-byte big-endian length, then a zero-length chunk. clamd answers `stream: OK` or
 * `stream: <signature> FOUND`; anything else (size limit, error) is thrown.
 */
export function clamdScan(
  buffer: Buffer,
  options: { host: string; port: number; timeoutMs: number },
): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: options.host, port: options.port });
    const replies: Buffer[] = [];
    socket.setTimeout(options.timeoutMs, () => socket.destroy(new Error('clamd timed out')));
    socket.on('error', reject);
    socket.on('data', (data) => replies.push(Buffer.isBuffer(data) ? data : Buffer.from(data)));
    socket.on('end', () => {
      const reply = Buffer.concat(replies).toString('utf8').replace(/\0/g, '').trim();
      if (/^stream: OK$/.test(reply)) return resolve({ clean: true });
      const found = /^stream: (.+) FOUND$/.exec(reply);
      if (found?.[1]) return resolve({ clean: false, signature: found[1] });
      reject(new Error(`Unexpected clamd reply: ${reply || '(empty)'}`));
    });
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < buffer.length; offset += CHUNK_BYTES) {
        const chunk = buffer.subarray(offset, offset + CHUNK_BYTES);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        socket.write(size);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
  });
}

/**
 * S6-VV-120 (#570) — refuse an infected upload before it is stored or processed. With
 * FILE_SCAN=required it fails closed: if clamd can't be reached the upload is refused (503), never
 * waved through. With FILE_SCAN=off (default, until ClamAV runs in that environment) it does nothing.
 */
export async function assertFileClean(buffer: Buffer, fileName: string): Promise<void> {
  if (env.FILE_SCAN !== 'required') return;
  let result: ScanResult;
  try {
    result = await clamdScan(buffer, {
      host: env.CLAMD_HOST,
      port: env.CLAMD_PORT,
      timeoutMs: env.CLAMD_TIMEOUT_MS,
    });
  } catch (error) {
    fileScansTotal.inc({ result: 'error' });
    logger.error(
      `File scan failed for ${fileName}: ${error instanceof Error ? error.message : error}`,
    );
    throw new ServiceUnavailableException({
      error: 'scan_unavailable',
      message: 'We could not check this file for malware right now. Please try again shortly.',
      statusCode: 503,
    });
  }
  if (result.clean) {
    fileScansTotal.inc({ result: 'clean' });
    return;
  }
  fileScansTotal.inc({ result: 'infected' });
  logger.warn(`Rejected infected upload ${fileName}: ${result.signature}`);
  throw new UnprocessableEntityException({
    error: 'file_infected',
    message: 'This file was flagged by our malware scanner and was not uploaded.',
    statusCode: 422,
  });
}

/** Proof documents may arrive inline as `data:` URIs; scan the decoded bytes like any upload. */
export async function assertDataUriClean(fileUrl: string, fileName: string): Promise<void> {
  const match = /^data:[^;,]*(;base64)?,(.*)$/s.exec(fileUrl.trim());
  if (!match) return;
  const bytes = match[1]
    ? Buffer.from(match[2] ?? '', 'base64')
    : Buffer.from(decodeURIComponent(match[2] ?? ''), 'utf8');
  await assertFileClean(bytes, fileName);
}
