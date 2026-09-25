import { describe, it, expect, vi } from 'vitest';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService', () => {
  it('calculates adverse impact satisfying 4/5ths rule when differences are within 80%', async () => {
    const mockPrisma = {
      skillVerificationAttempt: {
        findMany: vi.fn().mockResolvedValue([
          // Group A: 90% pass rate (9/10)
          ...Array(9).fill({
            passed: true,
            claimedProficiency: 'INTERMEDIATE',
            claim: { student: { institution: { name: 'Inst A' }, graduationYear: 2024 } },
          }),
          ...Array(1).fill({
            passed: false,
            claimedProficiency: 'INTERMEDIATE',
            claim: { student: { institution: { name: 'Inst A' }, graduationYear: 2024 } },
          }),
          // Group B: 80% pass rate (8/10) -> 80/90 = 0.888 >= 0.80
          ...Array(8).fill({
            passed: true,
            claimedProficiency: 'INTERMEDIATE',
            claim: { student: { institution: { name: 'Inst B' }, graduationYear: 2024 } },
          }),
          ...Array(2).fill({
            passed: false,
            claimedProficiency: 'INTERMEDIATE',
            claim: { student: { institution: { name: 'Inst B' }, graduationYear: 2024 } },
          }),
        ]),
      },
    };

    const service = new AnalyticsService(mockPrisma as any);
    const report = await service.getAdverseImpactReport('TECH_FULLSTACK', 1);

    expect(report.fourFifthsRuleMet).toBe(true);
    expect(report.groupRates.length).toBe(2);
    expect(report.groupRates.every((g) => !g.adverseImpactDetected)).toBe(true);
  });

  it('detects adverse impact when a group impact ratio falls below 0.80', async () => {
    const mockPrisma = {
      skillVerificationAttempt: {
        findMany: vi.fn().mockResolvedValue([
          // Group High: 100% pass rate (10/10)
          ...Array(10).fill({
            passed: true,
            claimedProficiency: 'ADVANCED',
            claim: { student: { institution: { name: 'Inst Top' }, graduationYear: 2024 } },
          }),
          // Group Low: 50% pass rate (5/10) -> 0.5 / 1.0 = 0.50 < 0.80
          ...Array(5).fill({
            passed: true,
            claimedProficiency: 'BEGINNER',
            claim: { student: { institution: { name: 'Inst Low' }, graduationYear: 2024 } },
          }),
          ...Array(5).fill({
            passed: false,
            claimedProficiency: 'BEGINNER',
            claim: { student: { institution: { name: 'Inst Low' }, graduationYear: 2024 } },
          }),
        ]),
      },
    };

    const service = new AnalyticsService(mockPrisma as any);
    const report = await service.getAdverseImpactReport('TECH_FULLSTACK', 1);

    expect(report.fourFifthsRuleMet).toBe(false);
    const impacted = report.groupRates.find((g) => g.group === 'Inst Low');
    expect(impacted?.adverseImpactDetected).toBe(true);
    expect(impacted?.impactRatio).toBe(0.5);
  });
});
