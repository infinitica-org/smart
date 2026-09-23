import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../platform/config/env.js';
import { InvitationsModule } from '../invitations/invitations.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { LinkedinOauthService } from './linkedin-oauth.service.js';
import { PasswordResetService } from './password-reset.service.js';

@Module({
  imports: [
    InvitationsModule,
    JwtModule.register({
      global: true,
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.JWT_ACCESS_TTL_SECONDS },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LinkedinOauthService, EmailVerificationService, PasswordResetService],
  exports: [AuthService, LinkedinOauthService],
})
export class AuthModule {}
