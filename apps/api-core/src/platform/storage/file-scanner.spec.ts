import { createServer, type AddressInfo, type Server } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { env, inc } = vi.hoisted(() => ({
  env: {
    FILE_SCAN: 'required' as 'off' | 'required',
    CLAMD_HOST: '127.0.0.1',
    CLAMD_PORT: 0,
    CLAMD_TIMEOUT_MS: 2000,
  },
  inc: vi.fn(),
}));
vi.mock('../config/env.js', () => ({ env }));
vi.mock('@smart/observability', () => ({ fileScansTotal: { inc } }));

import { assertDataUriClean, assertFileClean, clamdScan } from './file-scanner.js';

/** A fake clamd: parses INSTREAM framing, then answers FOUND if the bytes contain "EICAR". */
function fakeClamd(): Promise<{ server: Server; port: number; received: Buffer[] }> {
  const received: Buffer[] = [];
  const server = createServer((socket) => {
    let data = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
      const header = 'zINSTREAM\0';
      if (data.length < header.length + 4) return;
      let offset = header.length;
      const parts: Buffer[] = [];
      while (offset + 4 <= data.length) {
        const size = data.readUInt32BE(offset);
        if (size === 0) {
          const body = Buffer.concat(parts);
          received.push(body);
          socket.end(
            body.includes('EICAR') ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0',
          );
          return;
        }
        if (offset + 4 + size > data.length) return;
        parts.push(data.subarray(offset + 4, offset + 4 + size));
        offset += 4 + size;
      }
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: (server.address() as AddressInfo).port, received }),
    ),
  );
}

describe('S6-VV-120 upload malware scan', () => {
  let clamd: Awaited<ReturnType<typeof fakeClamd>>;

  beforeEach(async () => {
    clamd = await fakeClamd();
    env.FILE_SCAN = 'required';
    env.CLAMD_PORT = clamd.port;
    inc.mockClear();
  });

  afterEach(() => new Promise<void>((resolve) => clamd.server.close(() => resolve())));

  it('streams the whole file in length-prefixed chunks', async () => {
    const big = Buffer.alloc(200 * 1024, 7);
    const result = await clamdScan(big, { host: '127.0.0.1', port: clamd.port, timeoutMs: 2000 });

    expect(result).toEqual({ clean: true });
    expect(clamd.received[0]?.equals(big)).toBe(true);
  });

  it('lets a clean file through and counts it', async () => {
    await expect(
      assertFileClean(Buffer.from('%PDF-1.7 hello'), 'offer.pdf'),
    ).resolves.toBeUndefined();
    expect(inc).toHaveBeenCalledWith({ result: 'clean' });
  });

  it('refuses an infected file with 422 file_infected', async () => {
    await expect(
      assertFileClean(Buffer.from('X5O!P%@AP EICAR test'), 'bad.pdf'),
    ).rejects.toMatchObject({
      response: { error: 'file_infected' },
      status: 422,
    });
    expect(inc).toHaveBeenCalledWith({ result: 'infected' });
  });

  it('fails closed with 503 when clamd is unreachable', async () => {
    env.CLAMD_PORT = 1;
    await expect(assertFileClean(Buffer.from('anything'), 'a.pdf')).rejects.toMatchObject({
      response: { error: 'scan_unavailable' },
      status: 503,
    });
    expect(inc).toHaveBeenCalledWith({ result: 'error' });
  });

  it('does nothing when scanning is off', async () => {
    env.FILE_SCAN = 'off';
    env.CLAMD_PORT = 1;
    await expect(assertFileClean(Buffer.from('EICAR'), 'a.pdf')).resolves.toBeUndefined();
    expect(inc).not.toHaveBeenCalled();
  });

  it('scans the decoded bytes of an inline data: URI proof', async () => {
    const uri = `data:application/pdf;base64,${Buffer.from('EICAR inside').toString('base64')}`;
    await expect(assertDataUriClean(uri, 'proof.pdf')).rejects.toMatchObject({ status: 422 });
    await expect(
      assertDataUriClean('work-experience/u/proof.pdf', 'proof.pdf'),
    ).resolves.toBeUndefined();
    expect(clamd.received.at(-1)?.toString()).toBe('EICAR inside');
  });
});
