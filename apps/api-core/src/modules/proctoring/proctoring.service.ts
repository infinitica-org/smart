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
  PROCTORING_CHECKPOINT_DEDUP_MS,
  PROCTORING_SNAPSHOT_KEY_PREFIX,
  PROCTORING_WARNING_LIMIT_DEFAULT,
  REDIS_TTL_SECONDS,
  SMART_TOPICS,
  TECHNICAL_VIOLATION_KINDS,
  type BlobWsPayload,
  type IntegrityFlag,
  type IntegrityScoreBand,
  type ProctoringCheckpointRequest,
  type ProctoringCheckpointResponse,
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
  type ProctoringSnapshotUploadResponse,
  type ProctoringViolationKind,
  type ProctoringViolationRequest,
  type ProctoringVoiceResponse,
  type ProctoringWarningSnapshot,
} from '@smart/contracts';
import { integrityFlags } from '@smart/observability';
import { randomBytes, randomUUID } from 'node:crypto';
import { env } from '../../platform/config/env.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { analyzeProctoringSnapshot } from './cv-client.js';
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
const ENROLL_YAW = (id: string) => `proctor:enroll:yaw:${id}`;
const CV_PROCESSED = (objectKey: string) => `proctor:cv:processed:${objectKey}`;
const EVENTS = (id: string) => `proctor:events:${id}`;
const HB_ZSET = 'proctor:heartbeats';

const SNAPSHOT_UPLOAD_TTL_SECONDS = 15 * 60;

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
    @Inject(StorageService) private readonly storage: StorageService,
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

  async createSnapshotUploadUrl(
    userId: string,
    attemptId: string,
  ): Promise<ProctoringSnapshotUploadResponse> {
    await this.assertAttemptOwner(userId, attemptId);
    const objectKey = `${PROCTORING_SNAPSHOT_KEY_PREFIX}${attemptId}/${randomUUID()}.jpg`;
    const uploadUrl = await this.storage.getSignedUploadUrl({
      objectKey,
      contentType: 'image/jpeg',
    });
    return { uploadUrl, objectKey, expiresInSeconds: SNAPSHOT_UPLOAD_TTL_SECONDS };
  }

  private assertValidSnapshotObjectKey(attemptId: string, objectKey: string): void {
    const prefix = `${PROCTORING_SNAPSHOT_KEY_PREFIX}${attemptId}/`;
    if (!objectKey.startsWith(prefix) || objectKey.includes('..')) {
      throw new BadRequestException({
        error: 'invalid_object_key',
        message: 'Snapshot objectKey must belong to this attempt.',
        statusCode: 400,
      });
    }
    if (env.PROCTORING_FULL && objectKey.startsWith('stub:')) {
      throw new BadRequestException({
        error: 'invalid_object_key',
        message: 'Stub snapshot keys are not accepted when proctoring is enabled.',
        statusCode: 400,
      });
    }
  }

  async checkpoint(
    userId: string,
    body: ProctoringCheckpointRequest,
  ): Promise<ProctoringCheckpointResponse> {
    const subject = await this.assertAttemptOwner(userId, body.attemptId);
    this.assertValidSnapshotObjectKey(body.attemptId, body.objectKey);
    await this.ping(userId, body.attemptId);

    const analyzed = env.PROCTORING_CV_PROVIDER !== 'stub';
    const analysis = analyzed
      ? await analyzeProctoringSnapshot(body.objectKey)
      : { violations: [] };
    const detected = analysis.violations;
    const { newViolations, snapshot } = await this.applyCheckpointKinds(
      body.attemptId,
      detected,
      subject.integrityFlag,
      subject.persistAttempt,
    );
    await this.markSnapshotProcessed(body.objectKey);

    void this.outbox
      .enqueueEnvelope({
        topic: SMART_TOPICS.proctoringSnapshotReady,
        partitionKey: body.attemptId,
        eventType: SMART_TOPICS.proctoringSnapshotReady,
        source: 'proctoring',
        data: { attemptId: body.attemptId, objectKey: body.objectKey },
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `proctoring snapshot audit enqueue failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      });

    return {
      attemptId: body.attemptId,
      analyzed,
      detected,
      newViolations,
      warningCount: snapshot.warningCount,
      warningLimit: snapshot.warningLimit,
      locked: snapshot.locked,
    };
  }

  async isSnapshotProcessed(objectKey: string): Promise<boolean> {
    await this.ensureRedis();
    return (await this.redis.exists(CV_PROCESSED(objectKey))) === 1;
  }

  async markSnapshotProcessed(objectKey: string): Promise<void> {
    await this.ensureRedis();
    await this.redis.setex(CV_PROCESSED(objectKey), SNAPSHOT_UPLOAD_TTL_SECONDS, '1');
  }

  async applyCheckpointKinds(
    attemptId: string,
    kinds: ProctoringViolationKind[],
    integrityFlag?: IntegrityFlag,
    persistAttempt?: boolean,
  ): Promise<{
    newViolations: ProctoringViolationKind[];
    snapshot: ProctoringWarningSnapshot;
  }> {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (attempt?.status === 'IN_PROGRESS') {
      return this.recordCheckpointKinds(
        attemptId,
        kinds,
        attempt.integrityFlag as IntegrityFlag,
        true,
      );
    }
    await this.ensureRedis();
    const skillSession = await this.redis.get(skillVerifyRedisKey(attemptId));
    if (!skillSession) {
      const snapshot = await this.buildWarningSnapshot(attemptId, integrityFlag ?? 'CLEAN');
      return { newViolations: [], snapshot };
    }
    return this.recordCheckpointKinds(
      attemptId,
      kinds,
      integrityFlag ?? 'CLEAN',
      persistAttempt ?? false,
    );
  }

  private async recordCheckpointKinds(
    attemptId: string,
    kinds: ProctoringViolationKind[],
    integrityFlag: IntegrityFlag,
    persistAttempt: boolean,
  ): Promise<{
    newViolations: ProctoringViolationKind[];
    snapshot: ProctoringWarningSnapshot;
  }> {
    const deduped = await this.dedupeCheckpointKinds(attemptId, kinds);
    if (deduped.length === 0) {
      await this.publishBlob(attemptId, { type: 'blob_state', state: 'pass_cue' });
      const snapshot = await this.buildWarningSnapshot(attemptId, integrityFlag);
      return { newViolations: [], snapshot };
    }
    let snapshot = await this.buildWarningSnapshot(attemptId, integrityFlag);
    for (const kind of deduped) {
      snapshot = await this.record(
        attemptId,
        integrityFlag,
        kind,
        undefined,
        undefined,
        persistAttempt,
      );
      if (snapshot.locked) break;
    }
    return { newViolations: deduped, snapshot };
  }

  private async dedupeCheckpointKinds(
    attemptId: string,
    kinds: ProctoringViolationKind[],
  ): Promise<ProctoringViolationKind[]> {
    const events = await this.loadEvents(attemptId);
    const cutoff = Date.now() - PROCTORING_CHECKPOINT_DEDUP_MS;
    const recent = new Set(events.filter((event) => event.ts >= cutoff).map((event) => event.kind));
    return kinds.filter((kind) => !recent.has(kind));
  }

  private async buildWarningSnapshot(
    attemptId: string,
    integrityFlag: IntegrityFlag,
  ): Promise<ProctoringWarningSnapshot> {
    await this.ensureRedis();
    const warningCount = Number((await this.redis.get(WARN(attemptId))) ?? '0');
    const locked = (await this.redis.exists(LOCK(attemptId))) === 1;
    const events = await this.loadEvents(attemptId);
    const score = integrityScore(events);
    return {
      attemptId,
      warningCount,
      warningLimit: PROCTORING_WARNING_LIMIT_DEFAULT,
      locked,
      integrityScore: score,
      integrityBand: bandForScore(score),
      integrityFlag,
    };
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

  async enrollFace(
    userId: string,
    attemptId: string,
    objectKey?: string,
  ): Promise<ProctoringEnrollResponse> {
    await this.assertAttemptOwner(userId, attemptId);
    if (objectKey) {
      this.assertValidSnapshotObjectKey(attemptId, objectKey);
      const analysis = await analyzeProctoringSnapshot(objectKey);
      if ((analysis.faceCount ?? 0) !== 1) {
        return { enrolled: false, message: 'Enrollment frame must show exactly one face.' };
      }
      if (analysis.violations.length > 0) {
        return { enrolled: false, message: 'Fix camera setup before enrolling your face.' };
      }
      if (analysis.yaw !== undefined) {
        await this.ensureRedis();
        await this.redis.setex(
          ENROLL_YAW(attemptId),
          REDIS_TTL_SECONDS.proctoringWarning,
          String(analysis.yaw),
        );
      }
    }
    const state = await this.readOnboard(attemptId);
    state.faceEnrolled = true;
    await this.writeOnboard(attemptId, state);
    return {
      enrolled: true,
      message: objectKey
        ? 'Face baseline stored from enrollment snapshot.'
        : 'Face baseline stored.',
    };
  }

  async liveness(
    userId: string,
    body: ProctoringLivenessRequest,
  ): Promise<ProctoringLivenessResponse> {
    await this.assertAttemptOwner(userId, body.attemptId);
    let isLive = false;
    if (body.objectKey) {
      this.assertValidSnapshotObjectKey(body.attemptId, body.objectKey);
      const analysis = await analyzeProctoringSnapshot(body.objectKey);
      const yaw = analysis.yaw ?? 0;
      await this.ensureRedis();
      const baselineRaw = await this.redis.get(ENROLL_YAW(body.attemptId));
      const baseline = baselineRaw ? Number(baselineRaw) : 0;
      const delta = yaw - baseline;
      if (body.challenge === 'TURN_LEFT') isLive = delta <= -12;
      else if (body.challenge === 'TURN_RIGHT') isLive = delta >= 12;
      else isLive = Math.abs(delta) >= 8 || (analysis.violations.length === 0 && yaw !== 0);
    } else {
      const earDelta = body.earDelta ?? 0;
      const yawDelta = body.yawDelta ?? 0;
      isLive = body.challenge === 'BLINK' ? earDelta >= 0.04 : Math.abs(yawDelta) >= 0.06;
    }
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
      PHONE_DETECTED: 'Remove phones and secondary devices from view.',
      FOREIGN_OBJECT_DETECTED: 'Remove extra people, devices, and objects from the camera view.',
    };
    return map[kind] ?? 'Please follow the assessment rules.';
  }
}
