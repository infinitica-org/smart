import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactRulesService, type MessagingUser } from './contact-rules.service.js';
import { START_CONVERSATION_LIMIT_PER_HOUR } from './messaging.constants.js';

const INSTITUTION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_INSTITUTION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COMPANY = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const user = (id: string, role: string, extra: Partial<MessagingUser> = {}): MessagingUser => ({
  id,
  role,
  institutionId: null,
  companyId: null,
  deactivatedAt: null,
  ...extra,
});
const student = user('s1', 'STUDENT', { institutionId: INSTITUTION });
const employer = user('e1', 'COMPANY', { companyId: COMPANY });
const advisor = user('a1', 'PLACEMENT_STAFF', { institutionId: INSTITUTION });

describe('ContactRulesService (Th6-423/427/429)', () => {
  let prisma: any;
  let rules: ContactRulesService;
  let blocked: boolean;
  let companyStatus: 'APPROVED' | 'PENDING';
  let startsInLastHour: number;

  beforeEach(() => {
    blocked = false;
    companyStatus = 'APPROVED';
    startsInLastHour = 0;
    prisma = {
      block: { findFirst: vi.fn(async () => (blocked ? { blockerId: 'x' } : null)) },
      company: {
        findUnique: vi.fn(async () => ({ verificationStatus: companyStatus, deactivatedAt: null })),
      },
      // requireCompanyActor reads the caller's membership
      user: {
        findUnique: vi.fn(async () => ({
          role: 'COMPANY',
          companyId: COMPANY,
          companyRole: 'OWNER',
          deactivatedAt: null,
        })),
      },
      conversationParticipant: { count: vi.fn(async () => startsInLastHour) },
    };
    rules = new ContactRulesService(prisma);
  });

  describe('employer → student', () => {
    it('lets a verified employer start a conversation', async () => {
      expect(await rules.canStart(employer, student)).toMatchObject({
        allowed: true,
        reasonCode: 'OK',
      });
    });

    it('refuses an unverified employer with EMPLOYER_NOT_VERIFIED (Th6-429)', async () => {
      companyStatus = 'PENDING';
      expect(await rules.canStart(employer, student)).toEqual({
        allowed: false,
        reasonCode: 'EMPLOYER_NOT_VERIFIED',
        message: 'Your company must be verified before you can message students.',
      });
    });

    it('blocks a reply too once the company stops being verified', async () => {
      expect((await rules.canSend(employer, student)).allowed).toBe(true);
      companyStatus = 'PENDING';
      expect(await rules.canSend(employer, student)).toMatchObject({
        allowed: false,
        reasonCode: 'EMPLOYER_NOT_VERIFIED',
      });
    });

    it('honours the student contact preference', async () => {
      vi.spyOn(rules, 'studentAllowsEmployerContact').mockResolvedValue(false);
      expect(await rules.canStart(employer, student)).toMatchObject({
        allowed: false,
        reasonCode: 'EMPLOYER_CONTACT_DISABLED',
      });
    });

    it('a student can still reply to an employer', async () => {
      expect((await rules.canSend(student, employer)).allowed).toBe(true);
    });
  });

  describe('advisor → student (Th6-423)', () => {
    it('allows a student of the advisor’s own institution', async () => {
      expect((await rules.canStart(advisor, student)).allowed).toBe(true);
    });

    it('bypasses the employer contact preference', async () => {
      vi.spyOn(rules, 'studentAllowsEmployerContact').mockResolvedValue(false);
      expect((await rules.canStart(advisor, student)).allowed).toBe(true);
    });

    it('refuses a student outside the advisor’s scope', async () => {
      const outsider = user('s2', 'STUDENT', { institutionId: OTHER_INSTITUTION });
      expect(await rules.canStart(advisor, outsider)).toMatchObject({
        allowed: false,
        reasonCode: 'ADVISOR_OUT_OF_SCOPE',
      });
    });
  });

  describe('advisor campus scope (Th6-442)', () => {
    it('limits an advisor with a campus label to that campus', async () => {
      const northAdvisor = user('a2', 'PLACEMENT_STAFF', {
        institutionId: INSTITUTION,
        groupLabel: 'North',
      });
      const north = user('s3', 'STUDENT', { institutionId: INSTITUTION, groupLabel: 'North' });
      const south = user('s4', 'STUDENT', { institutionId: INSTITUTION, groupLabel: 'South' });
      expect((await rules.canStart(northAdvisor, north)).allowed).toBe(true);
      expect(await rules.canStart(northAdvisor, south)).toMatchObject({
        allowed: false,
        reasonCode: 'ADVISOR_OUT_OF_SCOPE',
      });
    });
  });

  describe('blocks (Th6-427)', () => {
    it('refuses both directions with the same generic message', async () => {
      blocked = true;
      const forward = await rules.canStart(employer, student);
      const backward = await rules.canSend(student, employer);
      expect(forward).toMatchObject({ allowed: false, reasonCode: 'BLOCKED' });
      expect(backward).toMatchObject({ allowed: false, reasonCode: 'BLOCKED' });
      expect(forward.message).toBe("You can't message this user.");
      expect(backward.message).toBe(forward.message);
    });

    it('lets messages through again after an unblock', async () => {
      blocked = true;
      expect((await rules.canSend(employer, student)).allowed).toBe(false);
      blocked = false;
      expect((await rules.canSend(employer, student)).allowed).toBe(true);
    });
  });

  describe('who can start at all', () => {
    it('does not let a student start a conversation with an employer or advisor', async () => {
      expect(await rules.canStart(student, employer)).toMatchObject({
        reasonCode: 'PAIR_NOT_ALLOWED',
      });
      expect(await rules.canStart(student, advisor)).toMatchObject({
        reasonCode: 'PAIR_NOT_ALLOWED',
      });
    });
    it('does not let an employer message an employer, or anyone message themselves', async () => {
      expect(
        await rules.canStart(employer, user('e2', 'COMPANY', { companyId: COMPANY })),
      ).toMatchObject({
        allowed: false,
      });
      expect((await rules.canStart(student, student)).allowed).toBe(false);
    });
    it('does not let a deactivated recipient be contacted', async () => {
      const gone = { ...student, deactivatedAt: new Date() };
      expect((await rules.canStart(employer, gone)).allowed).toBe(false);
    });
  });

  describe('rate limit', () => {
    it('refuses new conversations past the hourly limit', async () => {
      startsInLastHour = START_CONVERSATION_LIMIT_PER_HOUR;
      expect(await rules.canStart(employer, student)).toMatchObject({
        allowed: false,
        reasonCode: 'RATE_LIMITED',
      });
    });
    it('does not count adding to a conversation that already exists', async () => {
      startsInLastHour = START_CONVERSATION_LIMIT_PER_HOUR;
      expect((await rules.canStart(employer, student, { existing: true })).allowed).toBe(true);
    });
  });
});
