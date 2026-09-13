import { Module } from '@nestjs/common';
import { EvidenceCatalogService } from './evidence-catalog.service.js';
import { EvidenceController } from './evidence.controller.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';
import { EvidenceSyncService } from './evidence-sync.service.js';
import { EvidenceService } from './evidence.service.js';
import { VerificationOrchestratorService } from './verification-orchestrator.service.js';

@Module({
  controllers: [EvidenceController],
  providers: [
    EvidenceService,
    EvidenceCatalogService,
    EvidenceReconciliationService,
    EvidenceSyncService,
    VerificationOrchestratorService,
  ],
  exports: [
    EvidenceService,
    EvidenceCatalogService,
    EvidenceReconciliationService,
    EvidenceSyncService,
    VerificationOrchestratorService,
  ],
})
export class EvidenceModule {}
