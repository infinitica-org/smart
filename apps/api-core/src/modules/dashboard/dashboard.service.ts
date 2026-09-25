import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_PROFILE_VIEW_WINDOW_DAYS,
  EMPLOYER_VIEWER_ROLES,
  SKILL_DEFINITIONS,
  type DashboardActivityItem,
  type DashboardActivityKind,
  type DashboardApplication,
  type DashboardAttentionItem,
  type DashboardMatch,
  type DashboardNextAction,
  type DashboardOpportunity,
  type DashboardProfileViews,
  type ProfileViewSetting,
  type StudentDashboardSummary,
  type UpdateProfileViewSettingRequest,
} from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  PROFICIENCY_RANK,
  scoreCandidate,
  type RankerCandidate,
  type RankerJob,
} from '../matching/rules-ranker.js';
import { ProfileCompletionService } from '../users/profile-completion.service.js';
import {
  COMPANY_VISIBLE_WHERE,
  passesStudentEligibility,
} from '../student-jobs/job-eligibility.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));
const LIST_LIMIT = 5;
const ATTENTION_LIMIT = 10;
const ACTIVITY_LIMIT = 10;
const NEW_OPPORTUNITY_WINDOW_DAYS = 30;

/** Stages where the application is still in play (not hired, rejected or withdrawn). */
export const ACTIVE_APPLICATION_STAGES = [
  'APPLIED',
  'SHORTLISTED',
  'AI_VERIFIED',
  'INTERVIEW',
  'OFFER',
] as const;

/**
 * Audit actions shown to the student as "activity", with the kind each one belongs to.
 * Anything not listed here is never surfaced.
 */
const ACTIVITY_KIND_BY_PREFIX: ReadonlyArray<readonly [string, DashboardActivityKind]> = [
  ['personal_info.', 'PROFILE'],
  ['profile_visibility.', 'PROFILE'],
  ['profile_view_setting.', 'PROFILE'],
  ['messaging_preference.', 'PROFILE'],
  ['data_request.', 'PROFILE'],
  ['candidate_education.', 'VERIFICATION'],
  ['work_experience.', 'VERIFICATION'],
  ['candidate_certificate.', 'VERIFICATION'],
  ['evidence.', 'VERIFICATION'],
  ['skill_', 'VERIFICATION'],
];

const NEXT_ACTION_BY_AREA: Record<string, DashboardNextAction> = {
  skills: {
    title: 'Add your skills',
    description: 'Tell SMART what you already know.',
    ctaLabel: 'Add skills',
    href: '/profile?section=skills',
  },
  languages: {
    title: 'Add languages',
    description: 'Language skills can open more opportunities.',
    ctaLabel: 'Add languages',
    href: '/profile?section=languages',
  },
  education: {
    title: 'Complete your education profile',
    description: 'Add your degree so employers can see your academic background.',
    ctaLabel: 'Continue to education',
    href: '/profile?section=education',
  },
  experience: {
    title: 'Add work experience',
    description: 'Share roles that shaped your professional journey.',
    ctaLabel: 'Add experience',
    href: '/profile?section=experience',
  },
  projects: {
    title: 'Add a project',
    description: 'Projects are strong evidence of what you have built.',
    ctaLabel: 'Add project',
    href: '/profile?section=projects',
  },
  certifications: {
    title: 'Add a certification',
    description: 'External certifications strengthen your profile.',
    ctaLabel: 'Add certification',
    href: '/profile?section=certifications',
  },
  professionalLinks: {
    title: 'Add professional links',
    description: 'LinkedIn or GitHub helps employers learn more about you.',
    ctaLabel: 'Add links',
    href: '/profile?section=links',
  },
  jobPreferences: {
    title: 'Set your job preferences',
    description: 'Tell employers where and how you want to work.',
    ctaLabel: 'Set preferences',
    href: '/profile',
  },
};

/** "candidate_education.updated" -> "Candidate education updated". */
export function humanizeAction(action: string): string {
  const text = action.replace(/[._]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function activityKindFor(action: string): DashboardActivityKind | null {
  for (const [prefix, kind] of ACTIVITY_KIND_BY_PREFIX) {
    if (action.startsWith(prefix)) return kind;
  }
  return null;
}

function stageLabel(stage: string): string {
  return stage.replace(/_/g, ' ').toLowerCase();
}

function rankOf(proficiency: string): number {
  return PROFICIENCY_RANK[proficiency as keyof typeof PROFICIENCY_RANK] ?? 1;
}

/** An open, recent opening the student is eligible for and has not applied to. */
interface EligibleOpening {
  id: string;
  roleTitle: string;
  companyName: string;
  location: string | null;
  employmentType: string | null;
  lastDateToApply: Date | null;
  createdAt: Date;
  domainCode: string | null;
  minYearsExperience: number | null;
  maxYearsExperience: number | null;
  requiredSkills: { minProficiency: string; skill: { code: string } }[];
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(ProfileCompletionService) private readonly profileCompletion: ProfileCompletionService,
  ) {}

  /** One authorised read model; every section is scoped to `studentId`. */
  async getSummary(studentId: string): Promise<StudentDashboardSummary> {
    // Opportunities and opening-level matches share one eligible-openings read.
    const eligible = this.loadEligibleOpenings(studentId);

    const [
      progress,
      attentionItems,
      topMatches,
      opportunities,
      activeApplications,
      recentActivity,
      profileViews,
    ] = await Promise.all([
      this.profileCompletion.getProgressForStudent(studentId),
      this.getAttentionItems(studentId),
      eligible.then((rows) => this.topMatchesFrom(studentId, rows)),
      eligible.then((rows) => this.opportunitiesFrom(rows)),
      this.getActiveApplications(studentId),
      this.getRecentActivity(studentId),
      this.getProfileViews(studentId),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      completion: {
        percent: progress.percent,
        completedAreas: [...progress.completedAreas],
        incompleteAreas: [...progress.incompleteAreas],
      },
      nextAction: this.nextActionFor(progress.incompleteAreas),
      attentionItems,
      topMatches,
      opportunities,
      activeApplications,
      recentActivity,
      profileViews,
    };
  }

  /** The first incomplete area, in profile order. `null` once everything is complete. */
  nextActionFor(incompleteAreas: readonly string[]): DashboardNextAction | null {
    for (const area of incompleteAreas) {
      const action = NEXT_ACTION_BY_AREA[area];
      if (action) return action;
    }
    return null;
  }

  /**
   * Verification steps with a persisted state the student should know about. Failures that only
   * exist as background-job state in Redis have no stored status, so they are not visible here;
   * a job that keeps failing leaves its record in the in-progress state.
   */
  async getAttentionItems(studentId: string): Promise<DashboardAttentionItem[]> {
    const [credentials, certificates, education, experiences, projects, claims] = await Promise.all(
      [
        this.prisma.professionalCredential.findMany({
          where: { studentId, status: { in: ['PENDING_VERIFICATION', 'REVOKED'] } },
          select: { id: true, credentialName: true, issuer: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: ATTENTION_LIMIT,
        }),
        this.prisma.candidateCertificate.findMany({
          where: {
            candidateId: studentId,
            status: { in: ['DECLARED', 'UPLOADED', 'IN_VERIFICATION', 'REJECTED'] },
          },
          select: { id: true, title: true, issuer: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: ATTENTION_LIMIT,
        }),
        this.prisma.candidateEducation.findMany({
          where: { studentId, status: { in: ['unverified', 'rejected'] } },
          select: { id: true, institutionName: true, status: true, rejectionReason: true },
          orderBy: { createdAt: 'desc' },
          take: ATTENTION_LIMIT,
        }),
        this.prisma.workExperience.findMany({
          where: {
            studentId,
            status: { in: ['DRAFT', 'SUBMITTED', 'PENDING_EMPLOYER', 'REJECTED', 'EXPIRED'] },
          },
          select: { id: true, role: true, companyName: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: ATTENTION_LIMIT,
        }),
        this.prisma.project.findMany({
          where: {
            studentId,
            isActive: true,
            status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED'] },
          },
          select: { id: true, title: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: ATTENTION_LIMIT,
        }),
        this.prisma.skillClaim.findMany({
          where: { studentId, status: { in: ['DECLARED', 'BEGINNER_REATTEMPT'] } },
          select: { id: true, status: true, skill: { select: { code: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: ATTENTION_LIMIT,
        }),
      ],
    );

    const items: DashboardAttentionItem[] = [];

    for (const c of credentials) {
      const failed = c.status === 'REVOKED';
      items.push({
        id: `credential-${c.id}`,
        kind: 'CREDENTIAL',
        state: failed ? 'FAILED' : 'PROCESSING',
        title: `${c.credentialName} (${c.issuer})`,
        detail: failed
          ? 'Verification did not pass. Review the credential and upload supporting proof.'
          : 'Verification is in progress. We will update this when it finishes.',
        href: '/profile?section=credentials',
      });
    }

    for (const c of certificates) {
      const state =
        c.status === 'REJECTED'
          ? 'FAILED'
          : c.status === 'IN_VERIFICATION'
            ? 'PROCESSING'
            : 'NEEDS_ACTION';
      items.push({
        id: `certificate-${c.id}`,
        kind: 'CERTIFICATE',
        state,
        title: `${c.title} (${c.issuer})`,
        detail:
          state === 'FAILED'
            ? 'Verification did not pass. Check the details and submit again.'
            : state === 'PROCESSING'
              ? 'Verification is in progress. We will update this when it finishes.'
              : c.status === 'UPLOADED'
                ? 'Submit this certificate for verification.'
                : 'Upload proof to start verification.',
        href: '/profile?section=certifications',
      });
    }

    for (const e of education) {
      const rejected = e.status === 'rejected';
      items.push({
        id: `education-${e.id}`,
        kind: 'EDUCATION',
        state: rejected ? 'FAILED' : 'NEEDS_ACTION',
        title: e.institutionName,
        detail: rejected
          ? (e.rejectionReason ?? 'Your college did not confirm this entry.')
          : 'Attach proof so your college can confirm this entry.',
        href: '/profile?section=education',
      });
    }

    for (const w of experiences) {
      const state =
        w.status === 'PENDING_EMPLOYER' || w.status === 'SUBMITTED'
          ? 'PROCESSING'
          : w.status === 'REJECTED' || w.status === 'EXPIRED'
            ? 'FAILED'
            : 'NEEDS_ACTION';
      items.push({
        id: `work-experience-${w.id}`,
        kind: 'WORK_EXPERIENCE',
        state,
        title: `${w.role} at ${w.companyName}`,
        detail:
          state === 'PROCESSING'
            ? 'Waiting for your employer to confirm this role.'
            : state === 'FAILED'
              ? 'Verification did not complete. Resubmit with fresh proof.'
              : 'Submit this role for verification.',
        href: '/profile?section=experience',
      });
    }

    for (const p of projects) {
      const failed = p.status === 'REJECTED';
      items.push({
        id: `project-${p.id}`,
        kind: 'PROJECT',
        state: failed ? 'FAILED' : 'PROCESSING',
        title: p.title,
        detail: failed
          ? 'The review did not pass. Update the project and resubmit.'
          : 'Your project is being reviewed.',
        href: '/profile?section=projects',
      });
    }

    for (const claim of claims) {
      items.push({
        id: `skill-${claim.id}`,
        kind: 'SKILL',
        state: 'NEEDS_ACTION',
        title: SKILL_NAME_BY_CODE.get(claim.skill.code) ?? claim.skill.name,
        detail:
          claim.status === 'BEGINNER_REATTEMPT'
            ? 'Retake the diagnostic to verify this skill.'
            : 'Take the diagnostic assessment to verify this skill.',
        href: '/assessments',
      });
    }

    const rank = { FAILED: 0, NEEDS_ACTION: 1, PROCESSING: 2 } as const;
    return items.sort((a, b) => rank[a.state] - rank[b.state]).slice(0, ATTENTION_LIMIT);
  }

  /** Scored matches for this student. Nothing scorable means an empty list, never a guess. */
  async getTopMatches(studentId: string): Promise<DashboardMatch[]> {
    return this.topMatchesFrom(studentId, await this.loadEligibleOpenings(studentId));
  }

  private async topMatchesFrom(
    studentId: string,
    openings: readonly EligibleOpening[],
  ): Promise<DashboardMatch[]> {
    const [applicationMatches, openingMatches] = await Promise.all([
      this.getScoredApplications(studentId),
      this.scoreOpenings(studentId, openings),
    ]);
    return [...applicationMatches, ...openingMatches]
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, LIST_LIMIT);
  }

  /** Applications the system has already scored, still in play. */
  private async getScoredApplications(studentId: string): Promise<DashboardMatch[]> {
    const rows = await this.prisma.application.findMany({
      where: {
        studentId,
        matchScore: { not: null },
        stage: { in: [...ACTIVE_APPLICATION_STAGES] },
      },
      orderBy: { matchScore: 'desc' },
      take: LIST_LIMIT,
      select: {
        id: true,
        openingId: true,
        stage: true,
        matchScore: true,
        opening: { select: { roleTitle: true, companyName: true, location: true } },
      },
    });
    return rows.map((row) => ({
      source: 'APPLICATION' as const,
      applicationId: row.id,
      openingId: row.openingId,
      roleTitle: row.opening.roleTitle,
      companyName: row.opening.companyName,
      location: row.opening.location,
      matchPercent: Math.max(0, Math.min(100, Math.round(Number(row.matchScore) * 100))),
      stage: row.stage,
    }));
  }

  /**
   * Scores each eligible, unapplied opening against the student's VERIFIED skills with the same
   * locked rules ranker the institution shortlist uses (years and location are unknown for the
   * student, exactly as in that shortlist). Openings that list no required skills cannot be
   * scored meaningfully, and openings where the student holds none of the required skills are
   * not matches, so both are left out.
   */
  private async scoreOpenings(
    studentId: string,
    openings: readonly EligibleOpening[],
  ): Promise<DashboardMatch[]> {
    const scorable = openings.filter((opening) => opening.requiredSkills.length > 0);
    if (scorable.length === 0) return [];

    const claims = await this.prisma.skillClaim.findMany({
      where: { studentId, status: 'VERIFIED' },
      select: { proficiency: true, skill: { select: { code: true, domain: true } } },
    });
    if (claims.length === 0) return [];

    const candidate: RankerCandidate = {
      studentId,
      verified: claims.map((claim) => ({
        code: claim.skill.code,
        rank: rankOf(claim.proficiency),
        domain: claim.skill.domain,
      })),
      years: null,
      location: null,
    };

    const matches: DashboardMatch[] = [];
    for (const opening of scorable) {
      const job: RankerJob = {
        requiredSkills: opening.requiredSkills.map((row) => ({
          code: row.skill.code,
          minRank: rankOf(row.minProficiency),
        })),
        domainCode: opening.domainCode ?? 'SOFTWARE_IT',
        minYearsExperience: opening.minYearsExperience,
        maxYearsExperience: opening.maxYearsExperience,
        location: opening.location,
      };
      const score = scoreCandidate(job, candidate);
      if (score.s === 0) continue;
      matches.push({
        source: 'OPENING',
        applicationId: null,
        openingId: opening.id,
        roleTitle: opening.roleTitle,
        companyName: opening.companyName,
        location: opening.location,
        matchPercent: Math.max(0, Math.min(100, Math.round(score.matchMp / 10))),
        stage: null,
      });
    }
    return matches;
  }

  /**
   * Recent OPEN openings at the student's institution that they have not applied to and are
   * eligible for on the fields we store. No institution means no opportunities.
   */
  async getOpportunities(
    studentId: string,
  ): Promise<{ total: number; items: DashboardOpportunity[] }> {
    return this.opportunitiesFrom(await this.loadEligibleOpenings(studentId));
  }

  private opportunitiesFrom(openings: readonly EligibleOpening[]): {
    total: number;
    items: DashboardOpportunity[];
  } {
    return {
      total: openings.length,
      items: openings.slice(0, LIST_LIMIT).map((row) => ({
        openingId: row.id,
        roleTitle: row.roleTitle,
        companyName: row.companyName,
        location: row.location,
        employmentType: row.employmentType,
        lastDateToApply: row.lastDateToApply
          ? row.lastDateToApply.toISOString().slice(0, 10)
          : null,
        postedAt: row.createdAt.toISOString(),
      })),
    };
  }

  private async loadEligibleOpenings(studentId: string): Promise<EligibleOpening[]> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        institutionId: true,
        sscPercentage: true,
        hscPercentage: true,
        hasActiveBacklog: true,
      },
    });
    if (!student?.institutionId) return [];

    const now = new Date();
    const since = new Date(now.getTime() - NEW_OPPORTUNITY_WINDOW_DAYS * DAY_MS);
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const rows = await this.prisma.jobOpening.findMany({
      where: {
        institutionId: student.institutionId,
        status: 'OPEN',
        createdAt: { gte: since },
        AND: [
          { OR: [{ lastDateToApply: null }, { lastDateToApply: { gte: today } }] },
          { applications: { none: { studentId } } },
          // JOB-02: a job the student hid (Th6-385) never comes back, and unverified companies never show.
          { hiddenBy: { none: { studentId } } },
          COMPANY_VISIBLE_WHERE,
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        roleTitle: true,
        companyName: true,
        location: true,
        employmentType: true,
        lastDateToApply: true,
        createdAt: true,
        domainCode: true,
        minYearsExperience: true,
        maxYearsExperience: true,
        minSscPercentage: true,
        minHscPercentage: true,
        backlogsAllowed: true,
        requiredSkills: { select: { minProficiency: true, skill: { select: { code: true } } } },
      },
    });

    return rows.filter((row) => passesStudentEligibility(row, student));
  }

  async getActiveApplications(
    studentId: string,
  ): Promise<{ total: number; items: DashboardApplication[] }> {
    const where = { studentId, stage: { in: [...ACTIVE_APPLICATION_STAGES] } };
    const [total, rows] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: LIST_LIMIT,
        select: {
          id: true,
          openingId: true,
          stage: true,
          updatedAt: true,
          opening: { select: { roleTitle: true, companyName: true } },
        },
      }),
    ]);
    return {
      total,
      items: rows.map((row) => ({
        applicationId: row.id,
        openingId: row.openingId,
        roleTitle: row.opening.roleTitle,
        companyName: row.opening.companyName,
        stage: row.stage,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * Allow-listed audited events where the student is the actor OR the subject (for example a
   * college confirming their education), plus real stage changes on their applications.
   * Newest first.
   */
  async getRecentActivity(studentId: string): Promise<DashboardActivityItem[]> {
    const [audits, stageEvents] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          AND: [
            {
              OR: [
                { actorId: studentId },
                { resourceType: 'user', resourceId: studentId },
                { metadata: { path: ['studentId'], equals: studentId } },
              ],
            },
            { OR: ACTIVITY_KIND_BY_PREFIX.map(([prefix]) => ({ action: { startsWith: prefix } })) },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: ACTIVITY_LIMIT,
        select: { id: true, action: true, actorId: true, createdAt: true },
      }),
      this.prisma.applicationStageEvent.findMany({
        where: { application: { studentId } },
        orderBy: { createdAt: 'desc' },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          toStage: true,
          createdAt: true,
          application: { select: { opening: { select: { roleTitle: true, companyName: true } } } },
        },
      }),
    ]);

    const items: DashboardActivityItem[] = [];
    for (const row of audits) {
      const kind = activityKindFor(row.action);
      if (!kind) continue;
      items.push({
        id: `audit-${row.id}`,
        kind,
        byYou: row.actorId === studentId,
        label: humanizeAction(row.action),
        occurredAt: row.createdAt.toISOString(),
      });
    }
    for (const row of stageEvents) {
      items.push({
        id: `stage-${row.id}`,
        kind: 'APPLICATION',
        byYou: false,
        label: `${row.application.opening.roleTitle} at ${row.application.opening.companyName} moved to ${stageLabel(row.toStage)}`,
        occurredAt: row.createdAt.toISOString(),
      });
    }
    return items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, ACTIVITY_LIMIT);
  }

  /** Employer views only, and only when the student has opted in; otherwise no number leaves the API. */
  async getProfileViews(studentId: string): Promise<DashboardProfileViews> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { showEmployerViewCount: true },
    });
    if (!student?.showEmployerViewCount) {
      return {
        visible: false,
        employerViews: null,
        windowDays: DASHBOARD_PROFILE_VIEW_WINDOW_DAYS,
      };
    }
    const since = new Date(Date.now() - DASHBOARD_PROFILE_VIEW_WINDOW_DAYS * DAY_MS);
    const employerViews = await this.prisma.profileView.count({
      where: {
        studentId,
        viewerRole: { in: [...EMPLOYER_VIEWER_ROLES] },
        createdAt: { gte: since },
      },
    });
    return { visible: true, employerViews, windowDays: DASHBOARD_PROFILE_VIEW_WINDOW_DAYS };
  }

  async getProfileViewSetting(studentId: string): Promise<ProfileViewSetting> {
    const student = await this.prisma.user.findUniqueOrThrow({
      where: { id: studentId },
      select: { showEmployerViewCount: true },
    });
    return { showEmployerViewCount: student.showEmployerViewCount };
  }

  /** Idempotent: setting the current value again writes nothing and audits nothing. */
  async updateProfileViewSetting(
    studentId: string,
    body: UpdateProfileViewSettingRequest,
  ): Promise<ProfileViewSetting> {
    const current = await this.getProfileViewSetting(studentId);
    if (current.showEmployerViewCount === body.showEmployerViewCount) return current;

    await this.prisma.user.update({
      where: { id: studentId },
      data: { showEmployerViewCount: body.showEmployerViewCount },
    });
    await this.auditPublisher.record({
      actorId: studentId,
      action: 'profile_view_setting.updated',
      resourceType: 'user',
      resourceId: studentId,
      reasonCode: null,
      metadata: {
        prior: current.showEmployerViewCount,
        next: body.showEmployerViewCount,
      },
    });
    return { showEmployerViewCount: body.showEmployerViewCount };
  }
}
