import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  ProctoringCheckpointRequestSchema,
  ProctoringConsentRequestSchema,
  ProctoringEnrollRequestSchema,
  ProctoringFingerprintRequestSchema,
  ProctoringLivenessRequestSchema,
  ProctoringPrecheckRequestSchema,
  ProctoringSnapshotUploadRequestSchema,
  ProctoringViolationRequestSchema,
  type BlobWsPayload,
  type ProctoringEnrollResponse,
  type ProctoringLivenessResponse,
  type ProctoringNonceResponse,
  type ProctoringOnboardingStatus,
  type ProctoringPingResponse,
  type ProctoringCheckpointResponse,
  type ProctoringPrecheckResponse,
  type ProctoringSnapshotUploadResponse,
  type ProctoringVoiceResponse,
  type ProctoringWarningSnapshot,
} from '@smart/contracts';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { ProctoringService } from './proctoring.service.js';

const AttemptBody = z.object({ attemptId: z.uuid() });
const VoiceBody = z.object({ attemptId: z.uuid(), phrase: z.string().max(200) });
const PingBody = z.object({ attemptId: z.uuid() });

@ApiTags('proctoring')
@Controller(`${API_PREFIX}/proctoring`)
@Roles('STUDENT')
export class ProctoringController {
  constructor(@Inject(ProctoringService) private readonly proctoring: ProctoringService) {}

  @Get(':attemptId/nonce')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a single-use HMAC nonce.' })
  @ApiResponse({ status: 200, description: 'Nonce' })
  nonce(
    @CurrentUser() user: RequestUser,
    @Param('attemptId') attemptId: string,
  ): Promise<ProctoringNonceResponse> {
    return this.proctoring.issueNonce(user.sub, attemptId);
  }

  @Get(':attemptId/snapshot')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Warning snapshot and HMAC secret.' })
  snapshot(
    @CurrentUser() user: RequestUser,
    @Param('attemptId') attemptId: string,
  ): Promise<ProctoringWarningSnapshot> {
    return this.proctoring.snapshot(user.sub, attemptId);
  }

  @Get(':attemptId/blob')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Latest Blob HUD payload.' })
  blob(
    @CurrentUser() user: RequestUser,
    @Param('attemptId') attemptId: string,
  ): Promise<BlobWsPayload> {
    return this.proctoring.latestBlob(user.sub, attemptId);
  }

  @Get(':attemptId/onboarding')
  @ApiBearerAuth()
  onboarding(
    @CurrentUser() user: RequestUser,
    @Param('attemptId') attemptId: string,
  ): Promise<ProctoringOnboardingStatus> {
    return this.proctoring.onboarding(user.sub, attemptId);
  }

  @Post('violations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'HMAC-signed violation ingest.' })
  @ApiResponse({ status: 401, description: 'Bad nonce or signature.' })
  ingest(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<ProctoringWarningSnapshot> {
    return this.proctoring.ingest(user.sub, ProctoringViolationRequestSchema.parse(body));
  }

  @Post('ping')
  @ApiBearerAuth()
  ping(@CurrentUser() user: RequestUser, @Body() body: unknown): Promise<ProctoringPingResponse> {
    return this.proctoring.ping(user.sub, PingBody.parse(body).attemptId);
  }

  @Post('fingerprint')
  @ApiBearerAuth()
  fingerprint(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.proctoring.fingerprint(user.sub, ProctoringFingerprintRequestSchema.parse(body));
  }

  @Post('checkpoint')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload checkpoint — sync CV analyze and return violations.' })
  checkpoint(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<ProctoringCheckpointResponse> {
    return this.proctoring.checkpoint(user.sub, ProctoringCheckpointRequestSchema.parse(body));
  }

  @Post(':attemptId/snapshot-upload-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Presigned PUT URL for a proctoring JPEG snapshot.' })
  snapshotUploadUrl(
    @CurrentUser() user: RequestUser,
    @Param('attemptId') attemptId: string,
    @Body() body: unknown,
  ): Promise<ProctoringSnapshotUploadResponse> {
    ProctoringSnapshotUploadRequestSchema.parse(body);
    return this.proctoring.createSnapshotUploadUrl(user.sub, attemptId);
  }

  @Post('consent')
  @ApiBearerAuth()
  consent(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.proctoring.consent(user.sub, ProctoringConsentRequestSchema.parse(body));
  }

  @Post('precheck')
  @ApiBearerAuth()
  precheck(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<ProctoringPrecheckResponse> {
    return this.proctoring.precheck(user.sub, ProctoringPrecheckRequestSchema.parse(body));
  }

  @Post('enroll-face')
  @ApiBearerAuth()
  enrollFace(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<ProctoringEnrollResponse> {
    const parsed = ProctoringEnrollRequestSchema.parse(body);
    return this.proctoring.enrollFace(user.sub, parsed.attemptId, parsed.objectKey);
  }

  @Post('liveness')
  @ApiBearerAuth()
  liveness(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<ProctoringLivenessResponse> {
    return this.proctoring.liveness(user.sub, ProctoringLivenessRequestSchema.parse(body));
  }

  @Post('calibrate-voice')
  @ApiBearerAuth()
  calibrateVoice(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<ProctoringVoiceResponse> {
    const parsed = VoiceBody.parse(body);
    return this.proctoring.calibrateVoice(user.sub, parsed.attemptId, parsed.phrase);
  }
}
