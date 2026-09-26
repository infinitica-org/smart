import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ContactDecision,
  ContactReasonCode,
  ConversationParticipantRole,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { requireCompanyActor } from '../company-profile/company-access.js';
import { ADVISOR_ROLES, START_CONVERSATION_LIMIT_PER_HOUR } from './messaging.constants.js';

export interface MessagingUser {
  readonly id: string;
  readonly role: string;
  readonly institutionId: string | null;
  readonly companyId: string | null;
  readonly deactivatedAt: Date | null;
  /** Campus label; an advisor with one is limited to students of that campus. */
  readonly groupLabel?: string | null;
}

const USER_SELECT = {
  id: true,
  role: true,
  institutionId: true,
  companyId: true,
  deactivatedAt: true,
  groupLabel: true,
} as const;

export const BLOCKED_MESSAGE = "You can't message this user.";

function decision(
  allowed: boolean,
  reasonCode: ContactReasonCode,
  message: string,
): ContactDecision {
  return { allowed, reasonCode, message };
}
const OK = decision(true, 'OK', '');

export function participantRoleOf(role: string): ConversationParticipantRole | null {
  if (role === 'STUDENT') return 'STUDENT';
  if (role === 'COMPANY') return 'EMPLOYER';
  if (ADVISOR_ROLES.includes(role as never)) return 'ADVISOR';
  return null;
}

/** Turns a refusal into the HTTP error the API returns. Blocks stay generic on purpose. */
export function refusal(d: ContactDecision): ForbiddenException {
  return new ForbiddenException({
    error: d.reasonCode.toLowerCase(),
    reasonCode: d.reasonCode,
    message: d.message,
    statusCode: d.reasonCode === 'RATE_LIMITED' ? 429 : 403,
  });
}

/**
 * COM-01 — the ONE place every contact rule lives. Starting a conversation (`canStart`) and replying in
 * one (`canSend`) both come through here, so a rule added for one ticket applies to every entry point.
 */
@Injectable()
export class ContactRulesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async loadUser(id: string): Promise<MessagingUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  }

  /** Th6-427 — a block in either direction. */
  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const found = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { blockerId: true },
    });
    return found !== null;
  }

  /**
   * Th6-429 — only a verified company may contact students.
   * TODO(Th6-346): replace with the shared company-verification check once that ticket lands.
   */
  async isCompanyVerified(companyId: string): Promise<boolean> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { verificationStatus: true, deactivatedAt: true },
    });
    return company?.verificationStatus === 'APPROVED' && !company.deactivatedAt;
  }

  /**
   * Th6-224 — the student's "who may contact me" preference.
   * TODO(Th6-224): read the real preference. Until it exists every student accepts employer contact.
   */
  async studentAllowsEmployerContact(_studentId: string): Promise<boolean> {
    return true;
  }

  /** Th6-423 — an advisor may contact students of their own institution only. */
  advisorInScope(advisor: MessagingUser, student: MessagingUser): boolean {
    if (advisor.institutionId === null || advisor.institutionId !== student.institutionId)
      return false;
    return !advisor.groupLabel || advisor.groupLabel === student.groupLabel;
  }

  private async startsInLastHour(userId: string): Promise<number> {
    return this.prisma.conversationParticipant.count({
      where: {
        userId,
        role: { in: ['EMPLOYER', 'ADVISOR'] },
        joinedAt: { gt: new Date(Date.now() - 3_600_000) },
      },
    });
  }

  /** The employer half shared by starting and replying: active member of a verified company. */
  private async employerDecision(
    sender: MessagingUser,
    student: MessagingUser,
  ): Promise<ContactDecision> {
    let companyId: string;
    try {
      companyId = (await requireCompanyActor(this.prisma, sender.id, 'company.applicants.manage'))
        .companyId;
    } catch {
      return decision(false, 'PAIR_NOT_ALLOWED', 'Your company account cannot send messages.');
    }
    if (!(await this.isCompanyVerified(companyId))) {
      return decision(
        false,
        'EMPLOYER_NOT_VERIFIED',
        'Your company must be verified before you can message students.',
      );
    }
    if (!(await this.studentAllowsEmployerContact(student.id))) {
      return decision(
        false,
        'EMPLOYER_CONTACT_DISABLED',
        'This student is not accepting messages from employers.',
      );
    }
    return OK;
  }

  async canStart(
    sender: MessagingUser,
    recipient: MessagingUser,
    options: { existing?: boolean } = {},
  ): Promise<ContactDecision> {
    if (sender.id === recipient.id || recipient.deactivatedAt || sender.deactivatedAt) {
      return decision(false, 'PAIR_NOT_ALLOWED', BLOCKED_MESSAGE);
    }
    if (await this.isBlockedEitherWay(sender.id, recipient.id)) {
      return decision(false, 'BLOCKED', BLOCKED_MESSAGE);
    }
    const from = participantRoleOf(sender.role);
    const to = participantRoleOf(recipient.role);
    if (to !== 'STUDENT' || (from !== 'EMPLOYER' && from !== 'ADVISOR')) {
      // Students reply to people who wrote to them; nobody else pairs up.
      return decision(false, 'PAIR_NOT_ALLOWED', "You can't start a conversation with this user.");
    }
    if (from === 'EMPLOYER') {
      const employer = await this.employerDecision(sender, recipient);
      if (!employer.allowed) return employer;
    } else if (!this.advisorInScope(sender, recipient)) {
      return decision(false, 'ADVISOR_OUT_OF_SCOPE', 'This student is not in your institution.');
    }
    // Adding to a conversation that already exists opens nothing new, so it is not rate-limited here.
    if (
      !options.existing &&
      (await this.startsInLastHour(sender.id)) >= START_CONVERSATION_LIMIT_PER_HOUR
    ) {
      return decision(
        false,
        'RATE_LIMITED',
        'You have started too many conversations. Try again later.',
      );
    }
    return OK;
  }

  /**
   * Replying inside an existing conversation. An employer whose company stopped being verified is
   * blocked from replying too (Th6-429: replies follow the same rule as new conversations).
   */
  async canSend(sender: MessagingUser, other: MessagingUser): Promise<ContactDecision> {
    if (await this.isBlockedEitherWay(sender.id, other.id)) {
      return decision(false, 'BLOCKED', BLOCKED_MESSAGE);
    }
    if (sender.deactivatedAt) return decision(false, 'PAIR_NOT_ALLOWED', BLOCKED_MESSAGE);
    const from = participantRoleOf(sender.role);
    if (from === 'EMPLOYER') return this.employerDecision(sender, other);
    return OK;
  }

  static notFound(): NotFoundException {
    return new NotFoundException({
      error: 'not_found',
      message: 'Conversation not found.',
      statusCode: 404,
    });
  }
}
