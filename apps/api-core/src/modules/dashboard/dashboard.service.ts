import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_PROFILE_VIEW_WINDOW_DAYS,
  EMPLOYER_VIEWER_ROLES,
  SKILL_DEFINITIONS,
  type DashboardActivityItem,
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
import { ProfileCompletionService } from '../users/profile-completion.service.js';

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

/** Only these audit actions are shown to the student as "activity". */
const ACTIVITY_ACTION_PREFIXES = [
  'personal_info.',
  'candidate_education.',
  'work_experience.',
  'candidate_certificate.',
  'evidence.',
  'skill_',
  'profile_visibility.',
  'messaging_preference.',
  'data_request.',
] as const;

const NEXT_ACTION_BY_AREA: Record<string, Omit<DashboardNextAction, 'href'> & { href: string }> = {
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

function stageLabel(stage: string): string {
  return stage.replace(/_/g, ' ').toLowerCase();
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
      this.getTopMatches(studentId),
      this.getOpportunities(studentId),
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

  async getAttentionItems(studentId: string): Promise<DashboardAttentionItem[]> {
    const [credentials, education, experiences, claims] = await Promise.all([
      this.prisma.professionalCredential.findMany({
        where: { studentId, status: { in: ['PENDING_VERIFICATION', 'REVOKED'] } },
        select: { id: true, credentialName: true, issuer: true, status: true },
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
      this.prisma.skillClaim.findMany({
        where: { studentId, status: { in: ['DECLARED', 'BEGINNER_REATTEMPT'] } },
        select: { id: true, status: true, skill: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: ATTENTION_LIMIT,
      }),
    ]);

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

  /** Applications the system has scored. Nothing scored yet means an empty list, never a guess. */
  async getTopMatches(studentId: string): Promise<DashboardMatch[]> {
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
   * Recent OPEN openings at the student's institution that they have not applied to and are
   * eligible for on the fields we store. No institution means no opportunities.
   */
  async getOpportunities(
    studentId: string,
  ): Promise<{ total: number; items: DashboardOpportunity[] }> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        institutionId: true,
        sscPercentage: true,
        hscPercentage: true,
        hasActiveBacklog: true,
      },
    });
    if (!student?.institutionId) return { total: 0, items: [] };

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
        minSscPercentage: true,
        minHscPercentage: true,
        backlogsAllowed: true,
      },
    });

    const eligible = rows.filter((row) => {
      if (row.minSscPercentage !== null && student.sscPercentage !== null) {
        if (Number(student.sscPercentage) < Number(row.minSscPercentage)) return false;
      }
      if (row.minHscPercentage !== null && student.hscPercentage !== null) {
        if (Number(student.hscPercentage) < Number(row.minHscPercentage)) return false;
      }
      if (!row.backlogsAllowed && student.hasActiveBacklog === true) return false;
      return true;
    });

    return {
      total: eligible.length,
      items: eligible.slice(0, LIST_LIMIT).map((row) => ({
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

  /** The student's own audited actions plus real stage changes on their applications, newest first. */
  async getRecentActivity(studentId: string): Promise<DashboardActivityItem[]> {
    const [audits, stageEvents] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          actorId: studentId,
          OR: ACTIVITY_ACTION_PREFIXES.map((prefix) => ({ action: { startsWith: prefix } })),
        },
        orderBy: { createdAt: 'desc' },
        take: ACTIVITY_LIMIT,
        select: { id: true, action: true, createdAt: true },
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

    const items: DashboardActivityItem[] = [
      ...audits.map((row) => ({
        id: `audit-${row.id}`,
        label: humanizeAction(row.action),
        occurredAt: row.createdAt.toISOString(),
      })),
      ...stageEvents.map((row) => ({
        id: `stage-${row.id}`,
        label: `${row.application.opening.roleTitle} at ${row.application.opening.companyName} moved to ${stageLabel(row.toStage)}`,
        occurredAt: row.createdAt.toISOString(),
      })),
    ];
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
