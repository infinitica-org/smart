import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CandidateOnboardingDraftSchema, CandidateOnboardingProfileSchema } from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  computeProfileCompletion,
  isProfileCompleteForSkillVerification,
  type ProfileProgressInput,
  type ProfileProgressResult,
} from './profile-completion.util.js';

@Injectable()
export class ProfileCompletionService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProgressForStudent(userId: string): Promise<ProfileProgressResult> {
    const input = await this.loadProgressInput(userId);
    return computeProfileCompletion(input);
  }

  async isCompleteForSkillVerification(userId: string): Promise<boolean> {
    const input = await this.loadProgressInput(userId);
    return isProfileCompleteForSkillVerification(input);
  }

  assertCompleteForSkillVerification(userId: string): Promise<void> {
    return this.isCompleteForSkillVerification(userId).then((complete) => {
      if (!complete) {
        throw new ForbiddenException({
          error: 'profile_incomplete',
          message: 'Reach at least 50% profile completion to unlock skill verification.',
          statusCode: 403,
        });
      }
    });
  }

  private async loadProgressInput(userId: string): Promise<ProfileProgressInput> {
    const [user, skillClaimRows, languages, education, experiences, projects, certificates] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { onboardingCompleted: true, onboardingDetails: true },
        }),
        this.prisma.skillClaim.findMany({
          where: { studentId: userId },
          include: { skill: { select: { code: true } } },
        }),
        this.prisma.candidateLanguage.findMany({ where: { studentId: userId } }),
        this.prisma.candidateEducation.findMany({ where: { studentId: userId } }),
        this.prisma.workExperience.findMany({ where: { studentId: userId } }),
        this.prisma.project.findMany({ where: { studentId: userId } }),
        this.prisma.candidateCertificate.findMany({ where: { candidateId: userId } }),
      ]);

    const profile =
      user?.onboardingCompleted && user.onboardingDetails
        ? CandidateOnboardingProfileSchema.safeParse(user.onboardingDetails)
        : null;
    const draft =
      user && !user.onboardingCompleted && user.onboardingDetails
        ? CandidateOnboardingDraftSchema.safeParse(user.onboardingDetails)
        : null;

    return {
      skillClaims: skillClaimRows,
      onboardingProfile: profile?.success ? profile.data : null,
      onboardingDraft: draft?.success ? draft.data : null,
      languages,
      education,
      experiences,
      projects,
      certificates,
    };
  }
}
