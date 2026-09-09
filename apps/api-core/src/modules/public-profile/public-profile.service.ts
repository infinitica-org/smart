import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SKILL_DEFINITIONS,
  TRACK_DEFINITIONS,
  type PublicCandidateProfileDto,
  type PublicProfileLinkResponse,
  type TrackCode,
} from '@smart/contracts';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));
const TRACK_BY_CODE = new Map(TRACK_DEFINITIONS.map((track) => [track.code, track]));

/**
 * The public, unauthenticated "know the candidate in one shot" profile —
 * built once here and served two ways: to the owning student for their own
 * preview (`/users/me/public-profile`), and to anyone with the share link
 * (`/public/candidates/:slug`, `@Public()`). Only ever composed from real,
 * already-verified signal (VERIFIED skill claims, VERIFIED work experience,
 * submitted projects, an issued certificate) — an employer with no login and
 * no way to cross-check anything must never see a self-declared claim
 * presented as fact.
 */
@Injectable()
export class PublicProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getOrCreateShareLink(userId: string): Promise<PublicProfileLinkResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { publicProfileSlug: true },
    });
    const slug =
      user.publicProfileSlug ??
      (
        await this.prisma.user.update({
          where: { id: userId },
          data: { publicProfileSlug: randomUUID().replace(/-/g, '').slice(0, 16) },
          select: { publicProfileSlug: true },
        })
      ).publicProfileSlug;
    return { slug: slug ?? '', url: `${env.VERIFY_APP_URL}/candidate/${slug ?? ''}` };
  }

  async getBySlug(slug: string): Promise<PublicCandidateProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { publicProfileSlug: slug },
      select: { id: true, profileVisible: true },
    });
    // CN-T09 — a real slug with visibility off must 404 exactly like a slug that
    // doesn't exist at all; never confirm to an outside caller that the link is real.
    if (!user || !user.profileVisible) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'No public profile at this link.',
        statusCode: 404,
      });
    }
    return this.build(user.id);
  }

  async getForOwner(userId: string): Promise<PublicCandidateProfileDto> {
    return this.build(userId);
  }

  private async build(userId: string): Promise<PublicCandidateProfileDto> {
    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        fullName: true,
        primaryTrack: { select: { code: true } },
        showInProgressItems: true,
      },
    });
    const showInProgress = owner.showInProgressItems;

    const [skillClaims, declaredCount, projects, workExperience, certificate, externalCertificates] =
      await Promise.all([
        this.prisma.skillClaim.findMany({
          where: { studentId: userId, status: 'VERIFIED' },
          include: { skill: { select: { code: true } } },
        }),
        this.prisma.skillClaim.count({ where: { studentId: userId } }),
        this.prisma.project.findMany({
          // A reviewer-rejected project (possible plagiarism/integrity flag) is never
          // portfolio material — everything else the student put up stays visible.
          where: { studentId: userId, status: { not: 'REJECTED' } },
          orderBy: { createdAt: 'desc' },
          include: { report: { select: { score: true } } },
        }),
        this.prisma.workExperience.findMany({
          // CN-T09 — verified-only by default; showInProgress additionally admits anything
          // not yet decided, but a VOIDED (SA-T08) or REJECTED/EXPIRED entry never appears
          // here regardless of that toggle.
          where: showInProgress
            ? { studentId: userId, status: { notIn: ['REJECTED', 'EXPIRED', 'VOIDED'] } }
            : { studentId: userId, status: 'VERIFIED' },
          orderBy: { startDate: 'desc' },
        }),
        this.prisma.certificate.findFirst({
          where: { userId, status: 'ISSUED', isPublic: true },
          include: { track: { select: { name: true } } },
        }),
        this.prisma.candidateCertificate.findMany({
          where: showInProgress
            ? { candidateId: userId, status: { notIn: ['REJECTED', 'VOIDED'] } }
            : { candidateId: userId, status: 'VERIFIED' },
          orderBy: { createdAt: 'desc' },
          include: { skills: true },
        }),
      ]);

    const track = owner.primaryTrack
      ? TRACK_BY_CODE.get(owner.primaryTrack.code as TrackCode)
      : undefined;

    return {
      fullName: owner.fullName,
      trackName: track?.name ?? null,
      trackCategory: track?.category ?? null,
      skills: skillClaims.map((claim) => ({
        skillCode: claim.skill.code,
        skillName: SKILL_NAME_BY_CODE.get(claim.skill.code) ?? claim.skill.code,
        proficiency: claim.proficiency,
      })),
      declaredSkillsCount: declaredCount,
      projects: projects.map((project) => ({
        projectId: project.id,
        title: project.title,
        outcome: project.outcome,
        stack: project.stack,
        githubUrl: project.githubUrl,
        liveUrl: project.liveUrl,
        status: project.status,
        score: project.report ? Number(project.report.score) : null,
      })),
      workExperience: workExperience.map((entry) => ({
        companyName: entry.companyName,
        role: entry.role,
        employmentType: entry.employmentType,
        startDate: entry.startDate.toISOString(),
        endDate: entry.endDate?.toISOString() ?? null,
        isCurrent: entry.isCurrent,
        inProgress: entry.status !== 'VERIFIED',
      })),
      certificate: certificate
        ? { trackName: certificate.track.name, tier: certificate.headlineTier }
        : null,
      externalCertificates: externalCertificates.map((cert) => ({
        title: cert.title,
        issuer: cert.issuer,
        verificationMethod: cert.verificationMethod,
        skills: cert.skills.map((skill) => ({
          skillName: SKILL_NAME_BY_CODE.get(skill.skillCode) ?? skill.skillCode,
          proficiency: skill.selfAssessedProficiency,
        })),
        inProgress: cert.status !== 'VERIFIED',
      })),
      showInProgressItems: showInProgress,
    };
  }
}
