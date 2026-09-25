import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationStageEventRepository } from './stage-event.repository.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'generated' ? [] : sourceFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('ApplicationStageEventRepository is append-only (Th6-418)', () => {
  it('exposes only append and reads: no update, upsert or delete', () => {
    const methods = Object.getOwnPropertyNames(ApplicationStageEventRepository.prototype).filter(
      (name) => name !== 'constructor',
    );
    expect(methods.sort()).toEqual(['append', 'listForApplication']);
    for (const name of methods) expect(name).not.toMatch(/update|upsert|delete|remove|edit|set/i);
  });

  it('appends one row inside the caller transaction, deriving the statuses from the stages', async () => {
    const tx: any = { applicationStageEvent: { create: vi.fn(async ({ data }: any) => data) } };
    const repo = new ApplicationStageEventRepository({} as never);
    await repo.append(tx, {
      applicationId: 'a1',
      orgId: 'org1',
      fromStage: 'SHORTLISTED',
      toStage: 'INTERVIEW',
      actorId: 'u1',
      actorType: 'EMPLOYER',
      note: 'good call',
      source: 'employer_board',
    });
    expect(tx.applicationStageEvent.create).toHaveBeenCalledWith({
      data: {
        applicationId: 'a1',
        orgId: 'org1',
        fromStage: 'SHORTLISTED',
        toStage: 'INTERVIEW',
        fromStatus: 'REVIEWING',
        toStatus: 'INTERVIEWING',
        actorId: 'u1',
        actorType: 'EMPLOYER',
        note: 'good call',
        source: 'employer_board',
      },
    });
  });

  it('records an initial event with no from-status', async () => {
    const tx: any = { applicationStageEvent: { create: vi.fn(async ({ data }: any) => data) } };
    const repo = new ApplicationStageEventRepository({} as never);
    await repo.append(tx, {
      applicationId: 'a1',
      orgId: 'org1',
      fromStage: null,
      toStage: 'APPLIED',
      actorId: null,
      actorType: 'SYSTEM',
      source: 'apply',
    });
    expect(tx.applicationStageEvent.create.mock.calls[0]?.[0].data).toMatchObject({
      fromStatus: null,
      toStatus: 'APPLIED',
      note: null,
    });
  });

  it('is written ONLY through the repository, and nothing edits or deletes events, anywhere in the API', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8');
      const rel = relative(SRC, file).replaceAll('\\', '/');
      // Every write goes through the repository; only it may touch the model directly.
      if (
        /applicationStageEvent\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\b/.test(
          text,
        ) &&
        rel !== 'modules/applications/stage-event.repository.ts'
      ) {
        offenders.push(rel);
      }
      // ...and nothing anywhere may update or delete a stage event, not even the repository.
      if (
        /applicationStageEvent\s*\.\s*(update|updateMany|upsert|delete|deleteMany)\b/.test(text)
      ) {
        offenders.push(`${rel} (edit/delete)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('is appended only by HiringService (no other module or service calls the repository)', () => {
    const callers = sourceFiles(SRC)
      .filter((file) => /ApplicationStageEventRepository/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file).replaceAll('\\', '/'))
      .filter((rel) => rel !== 'modules/applications/stage-event.repository.ts');
    expect(callers.sort()).toEqual([
      'modules/applications/applications.module.ts',
      'modules/applications/hiring.service.ts',
    ]);
  });

  it('has no API to edit or delete a stage event (no such route in the contracts)', async () => {
    const { ROUTES } = await import('@smart/contracts');
    const eventRoutes = ROUTES.filter((route) => /stage-events|stage_events/.test(route.path));
    expect(eventRoutes).toEqual([]);
  });
});
