import { Module } from '@nestjs/common';
import { Tier1IssuerRegistry } from '../candidate-certificates/verification/tier1-issuer-registry.js';
import { Tier2PublicUrlVerifier } from '../candidate-certificates/verification/tier2-public-url-verifier.js';
import { Tier3OcrVerifier } from '../candidate-certificates/verification/tier3-ocr-verifier.js';
import { CredentialDedupService } from '../candidate-certificates/verification/credential-dedup.service.js';
import { EvidenceCatalogService } from './evidence-catalog.service.js';
import { EvidenceController } from './evidence.controller.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';
import { EvidenceSyncService } from './evidence-sync.service.js';
import { EvidenceService } from './evidence.service.js';
import { EvidenceSkillInferenceService } from './evidence-skill-inference.service.js';
import { SkillLevelExplanationService } from './skill-level-explanation.service.js';
import { CredentialVerificationProcessor } from './verification/credential-verification.processor.js';
import { CredentialVerificationService } from './verification/credential-verification.service.js';
import { VerificationOrchestratorService } from './verification-orchestrator.service.js';
import { SkillClaimDeclareModule } from '../assessment/skill-claim-declare.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SkillInferenceUpdatedConsumer } from './skill-inference-updated.consumer.js';
import { SkillVerificationInferenceConsumer } from './skill-verification-inference.consumer.js';

@Module({
  imports: [SkillClaimDeclareModule, NotificationsModule],
  controllers: [EvidenceController],
  providers: [
    EvidenceService,
    EvidenceCatalogService,
    EvidenceReconciliationService,
    EvidenceSyncService,
    EvidenceSkillInferenceService,
    SkillLevelExplanationService,
    VerificationOrchestratorService,
    Tier1IssuerRegistry,
    Tier2PublicUrlVerifier,
    Tier3OcrVerifier,
    CredentialVerificationService,
    CredentialVerificationProcessor,
    CredentialDedupService,
    SkillInferenceUpdatedConsumer,
    SkillVerificationInferenceConsumer,
  ],
  exports: [
    EvidenceService,
    EvidenceCatalogService,
    EvidenceReconciliationService,
    EvidenceSyncService,
    EvidenceSkillInferenceService,
    SkillLevelExplanationService,
    VerificationOrchestratorService,
    CredentialVerificationService,
  ],
})
export class EvidenceModule {}
