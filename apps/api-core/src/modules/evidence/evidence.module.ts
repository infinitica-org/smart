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
import { CredentialVerificationProcessor } from './verification/credential-verification.processor.js';
import { CredentialVerificationService } from './verification/credential-verification.service.js';
import { VerificationOrchestratorService } from './verification-orchestrator.service.js';

@Module({
  controllers: [EvidenceController],
  providers: [
    EvidenceService,
    EvidenceCatalogService,
    EvidenceReconciliationService,
    EvidenceSyncService,
    VerificationOrchestratorService,
    Tier1IssuerRegistry,
    Tier2PublicUrlVerifier,
    Tier3OcrVerifier,
    CredentialVerificationService,
    CredentialVerificationProcessor,
    CredentialDedupService,
  ],
  exports: [
    EvidenceService,
    EvidenceCatalogService,
    EvidenceReconciliationService,
    EvidenceSyncService,
    VerificationOrchestratorService,
    CredentialVerificationService,
  ],
})
export class EvidenceModule {}
