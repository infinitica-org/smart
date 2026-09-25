import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import {
  API_PREFIX,
  DeactivateCompanyMemberRequestSchema,
  InviteRecruiterRequestSchema,
  RespondToReviewRequestSchema,
  UpdateCompanyMemberRoleRequestSchema,
  UpdateCompanyProfileRequestSchema,
  UuidSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { CompanyReviewsService } from './company-reviews.service.js';
import { CompanyProfileService } from './company-profile.service.js';
import { CompanyTeamService } from './company-team.service.js';
import { IdempotencyService } from './idempotency.service.js';

/** If-Match of "3", W/"3" or 3 gives 3. A missing header is 428; a malformed one is 400. */
export function parseIfMatch(header: string | undefined): number {
  if (!header?.trim()) {
    throw new HttpException(
      {
        error: 'precondition_required',
        message: 'Send an If-Match header with the profile version you loaded.',
        statusCode: 428,
      },
      428,
    );
  }
  const version = Number(header.trim().replace(/^W\//, '').replace(/"/g, ''));
  if (!Number.isInteger(version) || version < 1) {
    throw new BadRequestException({
      error: 'validation_failed',
      message: 'If-Match must be the numeric profile version.',
      statusCode: 400,
    });
  }
  return version;
}

function uuidParam(raw: string, message: string): string {
  const parsed = UuidSchema.safeParse(raw);
  if (!parsed.success) {
    throw new NotFoundException({ error: 'not_found', message, statusCode: 404 });
  }
  return parsed.data;
}

function memberIdParam(raw: string): string {
  return uuidParam(raw, 'Team member not found.');
}

@ApiTags('company-profile')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/employer`)
@Roles('COMPANY')
export class EmployerController {
  constructor(
    @Inject(CompanyProfileService) private readonly profiles: CompanyProfileService,
    @Inject(CompanyTeamService) private readonly team: CompanyTeamService,
    @Inject(CompanyReviewsService) private readonly reviews: CompanyReviewsService,
  ) {}

  @Get('company')
  @ApiOperation({ summary: 'Read my company profile for editing.' })
  getCompany(@CurrentUser() user: RequestUser) {
    return this.profiles.getForEditor(user.sub);
  }

  @Patch('company')
  @ApiOperation({ summary: 'Update the company profile (If-Match version; 409 on stale).' })
  updateCompany(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: unknown,
  ) {
    return this.profiles.update(user.sub, {
      key: IdempotencyService.requireKey(idempotencyKey),
      expectedVersion: parseIfMatch(ifMatch),
      body: UpdateCompanyProfileRequestSchema.parse(body),
    });
  }

  @Post('company/logo/upload')
  @ApiOperation({ summary: 'Upload the company logo (JPG/PNG, 2MB).' })
  async uploadLogo(@CurrentUser() user: RequestUser, @Req() request: FastifyRequest) {
    const parts = (
      request as FastifyRequest & { parts: (opts?: unknown) => AsyncIterableIterator<Multipart> }
    ).parts({ limits: { fileSize: 2 * 1024 * 1024 } });
    let buffer: Buffer | null = null;
    let fileName = '';
    let mimeType = 'application/octet-stream';
    try {
      for await (const part of parts) {
        if (part.type === 'file') {
          const file = part as MultipartFile;
          mimeType = file.mimetype;
          fileName = file.filename;
          buffer = await file.toBuffer();
        }
      }
    } catch {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The logo exceeds the 2MB limit or could not be read.',
        statusCode: 400,
      });
    }
    if (!buffer) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Choose a JPG or PNG logo image to upload.',
        statusCode: 400,
      });
    }
    return this.profiles.uploadLogo(user.sub, { buffer, fileName, mimeType });
  }

  @Get('reviews')
  @ApiOperation({ summary: 'List reviews of my company with any response.' })
  listReviews(@CurrentUser() user: RequestUser) {
    return this.reviews.list(user.sub);
  }

  @Put('reviews/:reviewId/response')
  @ApiOperation({ summary: 'Create or edit the single response to a permitted review.' })
  respondToReview(
    @CurrentUser() user: RequestUser,
    @Param('reviewId') reviewId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.reviews.respond(user.sub, {
      key: IdempotencyService.requireKey(idempotencyKey),
      reviewId: uuidParam(reviewId, 'Review not found.'),
      body: RespondToReviewRequestSchema.parse(body),
    });
  }

  @Get('members')
  @ApiOperation({ summary: 'List my company team.' })
  listMembers(@CurrentUser() user: RequestUser) {
    return this.team.list(user.sub);
  }

  @Post('invitations')
  @ApiOperation({ summary: 'Invite a recruiter (shared invitation flow).' })
  invite(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.team.invite(user.sub, {
      key: IdempotencyService.requireKey(idempotencyKey),
      body: InviteRecruiterRequestSchema.parse(body),
    });
  }

  @Patch('members/:memberId')
  @ApiOperation({ summary: 'Change a member role (always at least one owner).' })
  changeRole(
    @CurrentUser() user: RequestUser,
    @Param('memberId') memberId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.team.changeRole(user.sub, {
      key: IdempotencyService.requireKey(idempotencyKey),
      memberId: memberIdParam(memberId),
      body: UpdateCompanyMemberRoleRequestSchema.parse(body),
    });
  }

  @Post('members/:memberId/deactivate')
  @ApiOperation({ summary: 'Deactivate a teammate and revoke their sessions.' })
  deactivate(
    @CurrentUser() user: RequestUser,
    @Param('memberId') memberId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.team.deactivate(user.sub, {
      key: IdempotencyService.requireKey(idempotencyKey),
      memberId: memberIdParam(memberId),
      body: DeactivateCompanyMemberRequestSchema.parse(body ?? {}),
    });
  }

  @Post('members/:memberId/reactivate')
  @ApiOperation({ summary: 'Reactivate a deactivated teammate.' })
  reactivate(
    @CurrentUser() user: RequestUser,
    @Param('memberId') memberId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.team.reactivate(user.sub, {
      key: IdempotencyService.requireKey(idempotencyKey),
      memberId: memberIdParam(memberId),
    });
  }
}
