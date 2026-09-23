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
import { StorageService } from '../../platform/storage/storage.service.js';
import { mapStudentCapabilitiesToSummaries } from '../../common/competency-evidence-summary.js';
import { resolveProfilePhotoUrl } from '../users/profile-photo.util.js';

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
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /**
   * CN-T09 — once a candidate has claimed a username, their share link uses it
   * (`/candidate/<username>`) instead of the opaque slug: easier to read, easier to
   * remember, and it's the identity they picked. This holds from the moment it's
   * *reserved*, not only once it activates — the link is shown (and can be copied)
   * before the profile ever goes public, and it must never change underneath someone
   * who already copied it the moment they flip visibility on. Until then it 404s the
   * same as any other identifier for a profile that isn't visible yet (see `getBySlug`).
   * The random slug is still lazily minted as a fallback for anyone who skipped
   * claiming a username.
   */
  async getOrCreateShareLink(userId: string): Promise<PublicProfileLinkResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { publicProfileSlug: true, username: true },
    });

    if (user.username) {
      return { slug: user.username, url: `${env.VERIFY_APP_URL}/@${user.username}` };
    }

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

  /**
   * Resolves either the opaque share slug, `@username`, or an active claimed username — one public
   * lookup, so the frontend (and anyone with an old link) never needs to know which
   * kind of identifier they're holding.
   */
  async getBySlug(identifier: string): Promise<PublicCandidateProfileDto> {
    const cleanIdentifier = identifier.trim().replace(/^@/, '');
    const bySlug = await this.prisma.user.findUnique({
      where: { publicProfileSlug: cleanIdentifier },
      select: { id: true, profileVisible: true },
    });
    const user =
      bySlug ??
      (await this.prisma.user.findUnique({
        where: { usernameNormalized: cleanIdentifier.toLowerCase() },
        select: { id: true, profileVisible: true, usernameStatus: true },
      }));

    // CN-T09 — a real identifier with visibility off (or a reserved-but-not-yet-active
    // username) must 404 exactly like one that doesn't exist; never confirm to an
    // outside caller that the link is real.
    const resolvable =
      user &&
      user.profileVisible &&
      (!('usernameStatus' in user) || user.usernameStatus === 'ACTIVE');
    if (!resolvable) {
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

  /**
   * CN-T07 — evaluates profile activation eligibility against PROFILE_ACTIVATION_POLICY.
   * - SEGMENT_AWARE (default):
   *     Students: verified skill + verified cert
   *     Professionals: verified skill + verified cert + verified work experience
   * - STRICT_ALL_THREE:
   *     verified skill + verified cert + verified work experience
   */
  async evaluateActivationEligibility(userId: string): Promise<{
    eligible: boolean;
    verifiedSkillsCount: number;
    verifiedCertsCount: number;
    verifiedWorkExpCount: number;
  }> {
    const [
      verifiedSkillsCount,
      verifiedPlatformCertsCount,
      verifiedExtCertsCount,
      verifiedWorkExpCount,
      workExpCount,
    ] = await Promise.all([
      this.prisma.skillClaim.count({
        where: { studentId: userId, status: 'VERIFIED' },
      }),
      this.prisma.certificate.count({
        where: { userId, status: 'ISSUED', isPublic: true },
      }),
      this.prisma.candidateCertificate.count({
        where: { candidateId: userId, status: 'VERIFIED' },
      }),
      this.prisma.workExperience.count({
        where: { studentId: userId, status: 'VERIFIED' },
      }),
      this.prisma.workExperience.count({
        where: { studentId: userId },
      }),
    ]);

    const verifiedCertsCount = verifiedPlatformCertsCount + verifiedExtCertsCount;
    const policy =
      (env.PROFILE_ACTIVATION_POLICY as 'SEGMENT_AWARE' | 'STRICT_ALL_THREE') ?? 'SEGMENT_AWARE';

    let eligible = false;
    if (policy === 'STRICT_ALL_THREE') {
      eligible = verifiedSkillsCount > 0 && verifiedCertsCount > 0 && verifiedWorkExpCount > 0;
    } else {
      const isProfessional = verifiedWorkExpCount > 0 || workExpCount > 0;
      if (isProfessional) {
        eligible = verifiedSkillsCount > 0 && verifiedCertsCount > 0 && verifiedWorkExpCount > 0;
      } else {
        eligible = verifiedSkillsCount > 0 && verifiedCertsCount > 0;
      }
    }

    return { eligible, verifiedSkillsCount, verifiedCertsCount, verifiedWorkExpCount };
  }

  /**
   * CN-T07 — re-checks activation eligibility on admin void.
   * Deactivates the profile ONLY if remaining items no longer satisfy the policy.
   */
  async recheckActivationAfterVoid(userId: string): Promise<void> {
    const { eligible } = await this.evaluateActivationEligibility(userId);
    if (!eligible) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { profileVisible: false },
      });
    }
  }

  private async build(userId: string): Promise<PublicCandidateProfileDto> {
    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        fullName: true,
        profilePhotoObjectKey: true,
        primaryTrack: { select: { code: true } },
        showInProgressItems: true,
      },
    });
    const showInProgress = owner.showInProgressItems;

    const [
      skillClaims,
      declaredCount,
      projects,
      workExperience,
      certificate,
      externalCertificates,
      educationRecords,
      capabilityRows,
    ] = await Promise.all([
      this.prisma.skillClaim.findMany({
        where: { studentId: userId, status: 'VERIFIED' },
        include: { skill: { select: { code: true } } },
      }),
      this.prisma.skillClaim.count({ where: { studentId: userId } }),
      this.prisma.project.findMany({
        where: { studentId: userId, isActive: true, status: { not: 'REJECTED' } },
        orderBy: { createdAt: 'desc' },
        include: { report: { select: { score: true } } },
      }),
      this.prisma.workExperience.findMany({
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
      this.prisma.candidateEducation.findMany({
        where: { studentId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.studentCapability.findMany({
        where: { studentId: userId },
        take: 20,
        orderBy: { confidenceScore: 'desc' },
      }),
    ]);

    const track = owner.primaryTrack
      ? TRACK_BY_CODE.get(owner.primaryTrack.code as TrackCode)
      : undefined;

    return {
      fullName: owner.fullName,
      profilePhotoUrl: await resolveProfilePhotoUrl(this.storage, owner.profilePhotoObjectKey),
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
      education: educationRecords.map((edu) => ({
        institutionName: edu.institutionName,
        degree: edu.degree ?? null,
        fieldOfStudy: edu.fieldOfStudy ?? null,
        startDate: edu.startDate ?? null,
        endDate: edu.endDate ?? null,
        current: edu.current,
        grade: edu.grade ?? null,
      })),
      showInProgressItems: showInProgress,
      competencyEvidenceSummaries: mapStudentCapabilitiesToSummaries(capabilityRows),
    };
  }
}
