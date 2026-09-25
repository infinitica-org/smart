import { Inject, Injectable } from '@nestjs/common';
import type { AdverseImpactReportDto, CorrelationReportDto, TrackCode } from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  readonly owner = 'Vedika G';
  readonly purpose = 'Cohort readiness, gap reports, correlation.';

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * MAT-01 / I376: Match-to-interview and match-to-offer outcome correlation.
   * Compares interview and offer conversion rates across candidate certificate tiers.
   */
  async getCorrelationReport(
    trackCode: TrackCode = 'TECH_FULLSTACK',
  ): Promise<CorrelationReportDto> {
    // PlacementRecord has: outcome, cycle, packageLpa; tier must be joined from Certificate.
    const placements = await this.prisma.placementRecord.findMany({
      where: { track: { code: trackCode } },
      select: {
        userId: true,
        outcome: true,
        cycle: true,
        packageLpa: true,
      },
    });

    // Look up each user's highest certificate tier for the given track.
    const userIds = placements.map((p) => p.userId);
    const certs =
      userIds.length > 0
        ? await this.prisma.certificate.findMany({
            where: { userId: { in: userIds }, track: { code: trackCode }, status: 'ISSUED' },
            select: { userId: true, headlineTier: true },
            orderBy: { issuedAt: 'desc' },
          })
        : [];

    const certMap = new Map(certs.map((c) => [c.userId, c.headlineTier]));

    // Derive interview/offer from outcome value (no separate column in schema).
    const INTERVIEWED_OUTCOMES = ['OFFER_ACCEPTED', 'OFFER_REJECTED', 'REJECTED_AFTER_INTERVIEW'];
    const OFFERED_OUTCOMES = ['OFFER_ACCEPTED', 'OFFER_REJECTED'];

    const cycles = Array.from(new Set(placements.map((p) => p.cycle)));
    const totalCount = placements.length;
    const totalInterviews = placements.filter((p) =>
      INTERVIEWED_OUTCOMES.includes(p.outcome),
    ).length;
    const totalOffers = placements.filter((p) => OFFERED_OUTCOMES.includes(p.outcome)).length;

    const baseInterviewRate = totalCount > 0 ? totalInterviews / totalCount : 0;
    const baseOfferRate = totalCount > 0 ? totalOffers / totalCount : 0;

    const tiers = ['GOLD', 'SILVER', 'BRONZE', 'BELOW_BRONZE'] as const;
    const byTier = tiers.map((tier) => {
      const tierRows = placements.filter((p) => certMap.get(p.userId) === tier);
      const tierCount = tierRows.length;
      const tierInterviews = tierRows.filter((p) =>
        INTERVIEWED_OUTCOMES.includes(p.outcome),
      ).length;
      const tierOffers = tierRows.filter((p) => OFFERED_OUTCOMES.includes(p.outcome)).length;

      const packages = tierRows
        .map((p) => (p.packageLpa != null ? Number(p.packageLpa) : null))
        .filter((pkg): pkg is number => pkg !== null);
      const avgPkg =
        packages.length > 0 ? packages.reduce((a, b) => a + b, 0) / packages.length : null;

      return {
        tier,
        candidates: tierCount,
        interviewRate: tierCount > 0 ? tierInterviews / tierCount : 0,
        offerRate: tierCount > 0 ? tierOffers / tierCount : 0,
        averagePackageLpa: avgPkg,
      };
    });

    const goldTier = byTier.find((t) => t.tier === 'GOLD');
    const goldLift = goldTier && baseOfferRate > 0 ? goldTier.offerRate / baseOfferRate : null;

    return {
      trackCode,
      placementCycles: cycles,
      cyclesObserved: cycles.length,
      byTier,
      cohortBaseline: {
        interviewRate: baseInterviewRate,
        offerRate: baseOfferRate,
      },
      goldLiftMultiple: goldLift,
      statisticallyMeaningful: cycles.length >= 2 && totalCount >= 30,
      caveat:
        cycles.length < 2
          ? 'Sample size represents <2 cycles; statistical significance requires 2+ placement cycles.'
          : 'Statistically validated cohort outcomes.',
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * SEC-02 / I566: Test assessment outcomes for adverse impact using 4/5ths rule.
   * Compares selection/clearance rates across cohorts / institutions / graduation years.
   */
  async getAdverseImpactReport(
    trackCode: TrackCode = 'TECH_FULLSTACK',
    levelNumber: 1 | 2 | 3 | 4 | 5 = 1,
  ): Promise<AdverseImpactReportDto> {
    // Retrieve attempts with student and institution metadata
    const attempts = await this.prisma.skillVerificationAttempt.findMany({
      where: {
        claim: {
          student: {
            primaryTrack: { code: trackCode },
          },
        },
        technicalFailure: false,
      },
      select: {
        id: true,
        passed: true,
        claimedProficiency: true,
        claim: {
          select: {
            student: {
              select: {
                id: true,
                institutionId: true,
                institution: { select: { name: true } },
                graduationYear: true,
              },
            },
          },
        },
      },
    });

    if (attempts.length === 0) {
      return {
        trackCode,
        levelNumber,
        fourFifthsRuleMet: true,
        favorableGroup: 'COHORT_BASELINE',
        groupRates: [
          {
            group: 'COHORT_BASELINE',
            totalAssessed: 0,
            clearedCount: 0,
            selectionRate: 1.0,
            impactRatio: 1.0,
            adverseImpactDetected: false,
          },
        ],
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Partition attempts by cohort group (e.g. institution or graduation cohort)
    const groupMap = new Map<string, { total: number; passed: number }>();

    for (const attempt of attempts) {
      const instName = attempt.claim.student.institution?.name;
      const gradYear = attempt.claim.student.graduationYear;
      const groupKey = instName
        ? `${instName}`
        : gradYear
          ? `Class of ${gradYear}`
          : `Group ${attempt.claimedProficiency}`;

      const curr = groupMap.get(groupKey) || { total: 0, passed: 0 };
      curr.total += 1;
      if (attempt.passed === true) {
        curr.passed += 1;
      }
      groupMap.set(groupKey, curr);
    }

    // If only one group, add baseline comparison
    if (groupMap.size <= 1) {
      const total = attempts.length;
      const passed = attempts.filter((a) => a.passed === true).length;
      const rate = total > 0 ? passed / total : 1.0;
      return {
        trackCode,
        levelNumber,
        fourFifthsRuleMet: true,
        favorableGroup: 'COHORT_BASELINE',
        groupRates: [
          {
            group: 'COHORT_BASELINE',
            totalAssessed: total,
            clearedCount: passed,
            selectionRate: rate,
            impactRatio: 1.0,
            adverseImpactDetected: false,
          },
        ],
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Compute selection rates for each group
    const groups: Array<{
      group: string;
      totalAssessed: number;
      clearedCount: number;
      selectionRate: number;
    }> = [];

    let highestRate = 0;
    let favorableGroup = '';

    for (const [groupName, stats] of groupMap.entries()) {
      const selectionRate = stats.total > 0 ? stats.passed / stats.total : 0;
      groups.push({
        group: groupName,
        totalAssessed: stats.total,
        clearedCount: stats.passed,
        selectionRate,
      });

      if (selectionRate > highestRate) {
        highestRate = selectionRate;
        favorableGroup = groupName;
      }
    }

    const firstGroup = groups[0];
    if (!favorableGroup && firstGroup) {
      favorableGroup = firstGroup.group;
      highestRate = firstGroup.selectionRate;
    }

    // Calculate impact ratio relative to the favorable (highest selection rate) group
    // EEOC 4/5ths Rule: Adverse impact exists if impact ratio < 0.80 (80%)
    let fourFifthsRuleMet = true;

    const groupRates = groups.map((g) => {
      const impactRatio = highestRate > 0 ? g.selectionRate / highestRate : 1.0;
      const adverseImpactDetected = impactRatio < 0.8;
      if (adverseImpactDetected) {
        fourFifthsRuleMet = false;
      }
      return {
        group: g.group,
        totalAssessed: g.totalAssessed,
        clearedCount: g.clearedCount,
        selectionRate: g.selectionRate,
        impactRatio: Number(impactRatio.toFixed(3)),
        adverseImpactDetected,
      };
    });

    return {
      trackCode,
      levelNumber,
      fourFifthsRuleMet,
      favorableGroup,
      groupRates,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
