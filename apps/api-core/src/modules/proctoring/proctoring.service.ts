import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BlobWsPayloadSchema,
  DEFAULT_VIOLATION_SEVERITY,
  PROCTORING_WARNING_LIMIT_DEFAULT,
  REDIS_TTL_SECONDS,
  SMART_TOPICS,
  TECHNICAL_VIOLATION_KINDS,
  type BlobWsPayload,
  type IntegrityFlag,
  type IntegrityScoreBand,
  type ProctoringCheckpointRequest,
  type ProctoringConsentRequest,
  type ProctoringEnrollResponse,
  type ProctoringEventClass,
  type ProctoringFingerprintRequest,
  type ProctoringLivenessRequest,
  type ProctoringLivenessResponse,
  type ProctoringNonceResponse,
  type ProctoringOnboardingStatus,
  type ProctoringPingResponse,
  type ProctoringPrecheckRequest,
  type ProctoringPrecheckResponse,
  type ProctoringSeverity,
  type ProctoringViolationKind,
  type ProctoringViolationRequest,
  type ProctoringVoiceResponse,
  type ProctoringWarningSnapshot,
} from '@smart/contracts';
import { integrityFlags } from '@smart/observability';
import { randomBytes } from 'node:crypto';
import { env } from '../../platform/config/env.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { randomNonce, signViolation, signaturesMatch } from './hmac.js';
import { bandForScore, integrityScore, type StoredViolation } from './risk.js';

function skillVerifyRedisKey(attemptId: string): string {
  return `session:skill-verify:${attemptId}`;
}

function projectDefenseRedisKey(sessionId: string): string {
  return `project:defense:session:${sessionId}`;
}

const WARN = (id: string) => `proctor:warn:${id}`;
const HMAC = (id: string) => `proctor:hmac:${id}`;
const NONCE = (id: string, nonce: string) => `proctor:nonce:${id}:${nonce}`;
const FP = (id: string) => `proctor:fp:${id}`;
const BLOB = (id: string) => `proctor:blob:${id}`;
const LOCK = (id: string) => `proctor:lock:${id}`;
const ONBOARD = (id: string) => `proctor:onboard:${id}`;
const EVENTS = (id: string) => `proctor:events:${id}`;
const HB_ZSET = 'proctor:heartbeats';

type OnboardState = {
  consentAt: string | null;
  precheckPassed: boolean;
  faceEnrolled: boolean;
  livenessPassed: boolean;
  voiceCalibrated: boolean;
};

const emptyOnboard = (): OnboardState => ({
  consentAt: null,
  precheckPassed: false,
  faceEnrolled: false,
  livenessPassed: false,
  voiceCalibrated: false,
});

type ProctorSubject = {
  id: string;
  userId: string;
  status: string;
  integrityFlag: IntegrityFlag;
  persistAttempt: boolean;
};

@Injectable()
export class ProctoringService {
  private readonly logger = new Logger(ProctoringService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async assertAttemptOwner(userId: string, attemptId: string): Promise<ProctorSubject> {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (attempt) {
      if (attempt.userId !== userId) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'Not your attempt.',
          statusCode: 403,
        });
      }
      return {
        id: attempt.id,
        userId: attempt.userId,
        status: attempt.status,
        integrityFlag: attempt.integrityFlag as IntegrityFlag,
        persistAttempt: true,
      };
    }

    await this.ensureRedis();
    const raw = await this.redis.get(skillVerifyRedisKey(attemptId));
    if (raw) {
      const stored = JSON.parse(raw) as { userId?: string };
      if (stored.userId !== userId) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'Not your attempt.',
          statusCode: 403,
        });
      }
      return {
        id: attemptId,
        userId,
        status: 'IN_PROGRESS',
        integrityFlag: 'CLEAN',
        persistAttempt: false,
      };
    }

    const defenseRaw = await this.redis.get(projectDefenseRedisKey(attemptId));
    if (defenseRaw) {
      const stored = JSON.parse(defenseRaw) as { userId?: string; status?: string };
      if (stored.userId !== userId) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'Not your attempt.',
          statusCode: 403,
        });
      }
      return {
        id: attemptId,
        userId,
        status: stored.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        integrityFlag: 'CLEAN',
        persistAttempt: false,
      };
    }

    throw new NotFoundException({
      error: 'not_found',
      message: 'Attempt not found.',
      statusCode: 404,
    });
  }

  private async ensureRedis(): Promise<void> {
    if (this.redis.status === 'wait' || this.redis.status === 'end') {
      await this.redis.connect();
    }
  }

  private async hmacSecret(attemptId: string): Promise<string> {
    await this.ensureRedis();
    const existing = await this.redis.get(HMAC(attemptId));
    if (existing) return existing;
    const secret = randomBytes(24).toString('hex');
    await this.redis.setex(HMAC(attemptId), REDIS_TTL_SECONDS.proctoringHmac, secret);
    return secret;
  }

  async issueNonce(userId: string, attemptId: string): Promise<ProctoringNonceResponse> {
    await this.assertAttemptOwner(userId, attemptId);
    await this.ensureRedis();
    const nonce = randomNonce();
    await this.redis.setex(NONCE(attemptId, nonce), REDIS_TTL_SECONDS.proctoringNonce, '1');
    return { attemptId, nonce, expiresInSeconds: REDIS_TTL_SECONDS.proctoringNonce };
  }

  async snapshot(userId: string, attemptId: string): Promise<ProctoringWarningSnapshot> {
    const attempt = await this.assertAttemptOwner(userId, attemptId);
    await this.ensureRedis();
    const warningCount = Number((await this.redis.get(WARN(attemptId))) ?? '0');
    const locked = (await this.redis.exists(LOCK(attemptId))) === 1;
    const events = await this.loadEvents(attemptId);
    const score = integrityScore(events);
    const hmacSecret = await this.hmacSecret(attemptId);
    return {
      attemptId,
      warningCount,
      warningLimit: PROCTORING_WARNING_LIMIT_DEFAULT,
      locked,
      integrityScore: score,
      integrityBand: bandForScore(score),
      integrityFlag: attempt.integrityFlag as IntegrityFlag,
      hmacSecret,
    };
  }

  async latestBlob(userId: string, attemptId: string): Promise<BlobWsPayload> {
    await this.assertAttemptOwner(userId, attemptId);
    await this.ensureRedis();
    const raw = await this.redis.get(BLOB(attemptId));
    if (!raw) return { type: 'blob_state', state: 'idle' };
    return BlobWsPayloadSchema.parse(JSON.parse(raw));
  }

  async ping(userId: string, attemptId: string): Promise<ProctoringPingResponse> {
    const attempt = await this.assertAttemptOwner(userId, attemptId);
    if (attempt.status === 'IN_PROGRESS') {
      await this.ensureRedis();
      await this.redis.zadd(HB_ZSET, Date.now(), attemptId);
      await this.redis.expire(HB_ZSET, REDIS_TTL_SECONDS.proctoringHeartbeat);
    }
    return { status: 'ok', attemptId };
  }

  async ingest(
    userId: string,
    body: ProctoringViolationRequest,
  ): Promise<ProctoringWarningSnapshot> {
    const attempt = await this.assertAttemptOwner(userId, body.attemptId);
    await this.ensureRedis();
    const used = await this.redis.getdel(NONCE(body.attemptId, body.nonce));
    if (!used) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'invalid or missing event signature',
        statusCode: 401,
      });
    }
    const secret = await this.hmacSecret(body.attemptId);
    const expected = signViolation(secret, body.attemptId, body.nonce, body.kind);
    if (!signaturesMatch(expected, body.signature)) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'invalid or missing event signature',
        statusCode: 401,
      });
    }
    return this.record(
      attempt.id,
      attempt.integrityFlag,
      body.kind,
      body.severity,
      body.eventClass,
      attempt.persistAttempt,
    );
  }

  async record(
    attemptId: string,
    currentFlag: IntegrityFlag,
    kind: ProctoringViolationKind,
    severity: ProctoringSeverity = DEFAULT_VIOLATION_SEVERITY[kind] ?? 'medium',
    eventClass?: ProctoringEventClass,
    persistAttempt = true,
  ): Promise<ProctoringWarningSnapshot> {
    await this.ensureRedis();
    const classified: ProctoringEventClass =
      eventClass ?? (TECHNICAL_VIOLATION_KINDS.includes(kind) ? 'TECHNICAL' : 'INTEGRITY');
    const stored: StoredViolation = { kind, severity, ts: Date.now() };
    await this.redis.lpush(EVENTS(attemptId), JSON.stringify(stored));
    await this.redis.expire(EVENTS(attemptId), REDIS_TTL_SECONDS.proctoringWarning);
    let warningCount = Number((await this.redis.get(WARN(attemptId))) ?? '0');
    if (classified === 'INTEGRITY') {
      warningCount = await this.redis.incr(WARN(attemptId));
      await this.redis.expire(WARN(attemptId), REDIS_TTL_SECONDS.proctoringWarning);
    }
    const events = await this.loadEvents(attemptId);
    const score = integrityScore(events);
    const band: IntegrityScoreBand = bandForScore(score);
    let integrityFlag = currentFlag;
    let locked = (await this.redis.exists(LOCK(attemptId))) === 1;
    if (classified === 'INTEGRITY') {
      if (warningCount >= PROCTORING_WARNING_LIMIT_DEFAULT) {
        locked = true;
        integrityFlag = 'UNDER_REVIEW';
        await this.redis.setex(LOCK(attemptId), REDIS_TTL_SECONDS.proctoringWarning, '1');
        await this.publishBlob(attemptId, {
          type: 'session_terminated',
          state: 'terminated',
          reason: 'warning_limit_exceeded',
          message: 'Test terminated — warning limit reached.',
        });
      } else if (band === 'MAJOR' || warningCount >= 3) {
        integrityFlag = 'FLAGGED_PROCTOR';
      }
      if (integrityFlag !== currentFlag && persistAttempt) {
        await this.prisma.attempt.update({ where: { id: attemptId }, data: { integrityFlag } });
      }
      if (persistAttempt) {
        await this.prisma.integrityEvent.create({
          data: { attemptId, flag: integrityFlag, detail: { kind, severity, classified } },
        });
      }
      integrityFlags.inc({ flag: integrityFlag, track_code: 'unknown', level_number: '1' });
      if (!locked) {
        await this.publishBlob(attemptId, {
          type: 'blob_state',
          state: 'alert',
          violation: kind,
          message: this.messageFor(kind),
        });
      }
    } else {
      if (persistAttempt) {
        await this.prisma.integrityEvent.create({
          data: { attemptId, flag: currentFlag, detail: { kind, severity, classified } },
        });
      }
      await this.publishBlob(attemptId, {
        type: 'blob_state',
        state: 'alert',
        violation: kind,
        message: this.messageFor(kind),
      });
    }
    this.logger.log({ attemptId, kind, classified, warningCount }, 'proctoring.violation');
    return {
      attemptId,
      warningCount,
      warningLimit: PROCTORING_WARNING_LIMIT_DEFAULT,
      locked,
      integrityScore: score,
      integrityBand: band,
      integrityFlag,
    };
  }

  async fingerprint(userId: string, body: ProctoringFingerprintRequest) {
    await this.assertAttemptOwner(userId, body.attemptId);
    await this.ensureRedis();
    const baseline = await this.redis.get(FP(body.attemptId));
    if (!baseline) {
      await this.redis.setex(
        FP(body.attemptId),
        REDIS_TTL_SECONDS.proctoringWarning,
        body.fingerprintHash,
      );
      return { status: 'recorded' as const, fuzzyMismatch: false };
    }
    const mismatch = this.fuzzyMismatch(baseline, body.fingerprintHash);
    if (mismatch) {
      const subject = await this.assertAttemptOwner(userId, body.attemptId);
      await this.record(
        body.attemptId,
        subject.integrityFlag,
        'AUTOMATION_DETECTED',
        undefined,
        undefined,
        subject.persistAttempt,
      );
    }
    return { status: 'recorded' as const, fuzzyMismatch: mismatch };
  }

  async checkpoint(userId: string, body: ProctoringCheckpointRequest) {
    await this.assertAttemptOwner(userId, body.attemptId);
    await this.ping(userId, body.attemptId);
    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.proctoringSnapshotReady,
      partitionKey: body.attemptId,
      eventType: SMART_TOPICS.proctoringSnapshotReady,
      source: 'proctoring',
      data: { attemptId: body.attemptId, objectKey: body.objectKey },
    });
    return { queued: true as const };
  }

  async applyCheckpointKinds(attemptId: string, kinds: ProctoringViolationKind[]): Promise<void> {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (attempt?.status === 'IN_PROGRESS') {
      if (kinds.length === 0) {
        await this.publishBlob(attemptId, { type: 'blob_state', state: 'pass_cue' });
        return;
      }
      for (const kind of kinds) {
        const snap = await this.record(attemptId, attempt.integrityFlag as IntegrityFlag, kind);
        if (snap.locked) break;
      }
      return;
    }
    await this.ensureRedis();
    const skillSession = await this.redis.get(skillVerifyRedisKey(attemptId));
    if (!skillSession) return;
    if (kinds.length === 0) {
      await this.publishBlob(attemptId, { type: 'blob_state', state: 'pass_cue' });
      return;
    }
    for (const kind of kinds) {
      const snap = await this.record(attemptId, 'CLEAN', kind, undefined, undefined, false);
      if (snap.locked) break;
    }
  }

  async sweepStaleHeartbeats(): Promise<number> {
    await this.ensureRedis();
    const cutoff = Date.now() - 60_000;
    const stale = await this.redis.zrangebyscore(HB_ZSET, 0, cutoff);
    let processed = 0;
    for (const attemptId of stale) {
      const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
      if (attempt?.status === 'IN_PROGRESS') {
        await this.record(attemptId, attempt.integrityFlag as IntegrityFlag, 'HEARTBEAT_LOST');
        await this.redis.zadd(HB_ZSET, Date.now(), attemptId);
        processed += 1;
        continue;
      }
      const skillSession = await this.redis.get(skillVerifyRedisKey(attemptId));
      if (skillSession) {
        await this.record(attemptId, 'CLEAN', 'HEARTBEAT_LOST', undefined, undefined, false);
        await this.redis.zadd(HB_ZSET, Date.now(), attemptId);
        processed += 1;
        continue;
      }
      await this.redis.zrem(HB_ZSET, attemptId);
    }
    return processed;
  }

  async consent(userId: string, body: ProctoringConsentRequest) {
    await this.assertAttemptOwner(userId, body.attemptId);
    const state = await this.readOnboard(body.attemptId);
    state.consentAt = new Date().toISOString();
    await this.writeOnboard(body.attemptId, state);
    return this.onboardingStatus(body.attemptId, state);
  }

  async onboarding(userId: string, attemptId: string) {
    await this.assertAttemptOwner(userId, attemptId);
    return this.onboardingStatus(attemptId, await this.readOnboard(attemptId));
  }

  async precheck(
    userId: string,
    body: ProctoringPrecheckRequest,
  ): Promise<ProctoringPrecheckResponse> {
    await this.assertAttemptOwner(userId, body.attemptId);
    const passed =
      body.faceCentered &&
      body.brightness >= 35 &&
      body.brightness <= 230 &&
      body.audioRmsPercent <= 35;
    const state = await this.readOnboard(body.attemptId);
    state.precheckPassed = passed;
    await this.writeOnboard(body.attemptId, state);
    return {
      passed,
      message: passed
        ? 'Environment looks ready.'
        : 'Fix lighting, centering, or room noise, then retry.',
    };
  }

  async enrollFace(userId: string, attemptId: string): Promise<ProctoringEnrollResponse> {
    await this.assertAttemptOwner(userId, attemptId);
    const state = await this.readOnboard(attemptId);
    state.faceEnrolled = true;
    await this.writeOnboard(attemptId, state);
    return { enrolled: true, message: 'Face baseline stored (stub provider).' };
  }

  async liveness(
    userId: string,
    body: ProctoringLivenessRequest,
  ): Promise<ProctoringLivenessResponse> {
    await this.assertAttemptOwner(userId, body.attemptId);
    const isLive =
      body.challenge === 'BLINK' ? body.earDelta >= 0.04 : Math.abs(body.yawDelta) >= 0.06;
    const state = await this.readOnboard(body.attemptId);
    if (isLive) state.livenessPassed = true;
    await this.writeOnboard(body.attemptId, state);
    return { isLive, message: isLive ? 'Liveness confirmed.' : 'Repeat the head turn or blink.' };
  }

  async calibrateVoice(
    userId: string,
    attemptId: string,
    phrase: string,
  ): Promise<ProctoringVoiceResponse> {
    await this.assertAttemptOwner(userId, attemptId);
    const verified = phrase.trim().toLowerCase().includes('hi proctor');
    const state = await this.readOnboard(attemptId);
    if (verified) state.voiceCalibrated = true;
    await this.writeOnboard(attemptId, state);
    return {
      verified,
      transcribedText: phrase,
      message: verified ? 'Voice calibrated.' : 'Please say “Hi Proctor”.',
    };
  }

  async isProctorLocked(attemptId: string): Promise<boolean> {
    if (!env.PROCTORING_FULL) return false;
    await this.ensureRedis();
    return (await this.redis.exists(LOCK(attemptId))) === 1;
  }

  /** Defense interviews must pass onboarding and not be integrity-locked. */
  async assertInterviewReady(userId: string, attemptId: string): Promise<void> {
    if (!env.PROCTORING_FULL || env.NODE_ENV === 'test') return;

    await this.assertAttemptOwner(userId, attemptId);

    if (await this.isProctorLocked(attemptId)) {
      throw new ForbiddenException({
        error: 'proctor_locked',
        message: 'This interview session was locked due to integrity violations.',
        statusCode: 403,
      });
    }

    const state = await this.onboarding(userId, attemptId);
    if (!state.onboardingPassed) {
      throw new BadRequestException({
        error: 'proctoring_required',
        message: 'Complete proctoring setup before continuing the interview.',
        statusCode: 400,
      });
    }
  }

  private async loadEvents(attemptId: string): Promise<StoredViolation[]> {
    const raw = await this.redis.lrange(EVENTS(attemptId), 0, 199);
    return raw.map((row) => JSON.parse(row) as StoredViolation);
  }

  private async publishBlob(attemptId: string, payload: BlobWsPayload): Promise<void> {
    await this.redis.setex(
      BLOB(attemptId),
      REDIS_TTL_SECONDS.proctoringBlob,
      JSON.stringify(payload),
    );
    await this.redis.publish(`proctor:blob:${attemptId}`, JSON.stringify(payload));
  }

  private async readOnboard(attemptId: string): Promise<OnboardState> {
    await this.ensureRedis();
    const raw = await this.redis.get(ONBOARD(attemptId));
    return raw
      ? ({ ...emptyOnboard(), ...(JSON.parse(raw) as OnboardState) } as OnboardState)
      : emptyOnboard();
  }

  private async writeOnboard(attemptId: string, state: OnboardState): Promise<void> {
    await this.redis.setex(
      ONBOARD(attemptId),
      REDIS_TTL_SECONDS.proctoringWarning,
      JSON.stringify(state),
    );
  }

  private onboardingStatus(attemptId: string, state: OnboardState): ProctoringOnboardingStatus {
    const onboardingPassed = Boolean(
      state.consentAt && state.precheckPassed && state.faceEnrolled && state.livenessPassed,
    );
    return { attemptId, ...state, onboardingPassed };
  }

  private fuzzyMismatch(baseline: string, incoming: string): boolean {
    const maxLen = Math.max(baseline.length, incoming.length);
    if (maxLen === 0) return false;
    let diffs = Math.abs(baseline.length - incoming.length);
    const minLen = Math.min(baseline.length, incoming.length);
    for (let i = 0; i < minLen; i += 1) if (baseline[i] !== incoming[i]) diffs += 1;
    return diffs / maxLen > 0.35;
  }

  private messageFor(kind: ProctoringViolationKind): string {
    const map: Partial<Record<ProctoringViolationKind, string>> = {
      FULLSCREEN_EXIT: 'Please return to fullscreen to continue.',
      TAB_BLUR: 'Stay on the assessment tab.',
      DEVTOOLS_OPEN: 'Developer tools are not allowed.',
      NO_FACE: 'Keep your face visible to the camera.',
      MULTIPLE_FACES: 'Only one person should be in frame.',
      HEARTBEAT_LOST: 'Connection check failed — stay on this page.',
    };
    return map[kind] ?? 'Please follow the assessment rules.';
  }
}
