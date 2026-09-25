import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { buildPinoHttpOptions } from '@smart/observability';
import { LoggerModule } from 'nestjs-pino';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { FeatureFlagGuard } from './common/guards/feature-flag.guard.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { SessionHoldGuard } from './common/guards/session-hold.guard.js';
import { ObservabilityInterceptor } from './common/interceptors/observability.interceptor.js';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor.js';
import { AuditAccessInterceptor } from './common/interceptors/audit-access.interceptor.js';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AssessmentModule } from './modules/assessment/assessment.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CalibrationModule } from './modules/calibration/calibration.module.js';
import { CandidateCertificatesModule } from './modules/candidate-certificates/candidate-certificates.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { StudentJobsModule } from './modules/student-jobs/student-jobs.module.js';
import { CompanyProfileModule } from './modules/company-profile/company-profile.module.js';
import { CertificateModule } from './modules/certificate/certificate.module.js';
import { CorroborationModule } from './modules/corroboration/corroboration.module.js';
import { EvidenceModule } from './modules/evidence/evidence.module.js';
import { SignalIngestionModule } from './modules/signal-ingestion/signal-ingestion.module.js';
import { EvaluationModule } from './modules/evaluation/evaluation.module.js';
import { SignalEncoderModule } from './modules/signal-encoder/signal-encoder.module.js';
import { InstitutionsModule } from './modules/institutions/institutions.module.js';
import { MatchingModule } from './modules/matching/matching.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PlacementModule } from './modules/placement/placement.module.js';
import { ProctoringModule } from './modules/proctoring/proctoring.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { PublicProfileModule } from './modules/public-profile/public-profile.module.js';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module.js';
import { SandboxModule } from './modules/sandbox/sandbox.module.js';
import { UsernameModule } from './modules/username/username.module.js';
import { AccountModule } from './modules/account/account.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { ReadinessModule } from './modules/readiness/readiness.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkExperienceModule } from './modules/work-experience/work-experience.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { ConfigModule } from './platform/config/config.module.js';
import { AuditModule } from './platform/audit/audit.module.js';
import { env } from './platform/config/env.js';
import { HealthModule } from './platform/health/health.module.js';
import { KafkaModule } from './platform/kafka/kafka.module.js';
import { MailerModule } from './platform/mailer/mailer.module.js';
import { PrismaModule } from './platform/prisma/prisma.module.js';
import { QueueModule } from './platform/queue/queue.module.js';
import { RedisModule } from './platform/redis/redis.module.js';
import { StorageModule } from './platform/storage/storage.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: buildPinoHttpOptions({
        serviceName: env.APP_NAME,
        level: env.LOG_LEVEL,
        version: env.APP_VERSION,
        environment: env.NODE_ENV,
        pretty: env.LOG_PRETTY,
      }),
    }),
    ConfigModule,
    AuditModule,
    PrismaModule,
    RedisModule,
    StorageModule,
    KafkaModule,
    MailerModule,
    QueueModule,
    HealthModule,
    RateLimitModule,
    AuthModule,
    UsersModule,
    UsernameModule,
    AccountModule,
    CompanyProfileModule,
    StudentJobsModule,
    ApplicationsModule,
    MessagingModule,
    DashboardModule,
    ReadinessModule,
    WorkExperienceModule,
    InstitutionsModule,
    CatalogModule,
    AssessmentModule,
    SandboxModule,
    EvaluationModule,
    CorroborationModule,
    EvidenceModule,
    SignalIngestionModule,
    SignalEncoderModule,
    AiGatewayModule,
    CalibrationModule,
    CandidateCertificatesModule,
    CertificateModule,
    MatchingModule,
    NotificationsModule,
    PlacementModule,
    ProctoringModule,
    ProjectsModule,
    PublicProfileModule,
    AnalyticsModule,
    WebhooksModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: SessionHoldGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: FeatureFlagGuard },
    { provide: APP_INTERCEPTOR, useClass: ObservabilityInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditAccessInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
