import { describe, expect, it, vi } from 'vitest';
import { PipelineMetricsService } from './pipeline-metrics.service.js';

const service = (events: { applicationId: string; toStatus: string }[]) => {
  const findMany = vi.fn(async () => events);
  return {
    findMany,
    svc: new PipelineMetricsService({ applicationStageEvent: { findMany } } as any),
  };
};

describe('PipelineMetricsService.conversion (Th6-421)', () => {
  it('reports an empty state, and no rate, when nothing has moved yet', async () => {
    const { svc } = service([]);
    const result = await svc.conversion({});
    expect(result.status).toBe('empty');
    expect(result.shortlistToInterview).toEqual({ entered: 0, converted: 0, ratePercent: null });
    expect(result.interviewToHire.ratePercent).toBeNull();
  });

  it('counts each application once per stage, so repeated moves never inflate a rate', async () => {
    const { svc } = service([
      { applicationId: 'a', toStatus: 'REVIEWING' },
      { applicationId: 'a', toStatus: 'REVIEWING' },
      { applicationId: 'a', toStatus: 'INTERVIEWING' },
      { applicationId: 'a', toStatus: 'HIRED' },
      { applicationId: 'b', toStatus: 'REVIEWING' },
      { applicationId: 'b', toStatus: 'INTERVIEWING' },
      { applicationId: 'c', toStatus: 'REVIEWING' },
      { applicationId: 'd', toStatus: 'REVIEWING' },
    ]);
    const result = await svc.conversion({});
    expect(result.status).toBe('ready');
    expect(result.shortlistToInterview).toEqual({ entered: 4, converted: 2, ratePercent: 50 });
    expect(result.interviewToHire).toEqual({ entered: 2, converted: 1, ratePercent: 50 });
  });

  it('applies the date window to the history it reads', async () => {
    const { svc, findMany } = service([]);
    await svc.conversion({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' });
    const where = (findMany.mock.calls[0] as any)[0].where;
    expect(where.createdAt.gte).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(where.createdAt.lte).toEqual(new Date('2026-09-30T00:00:00.000Z'));
  });
});
