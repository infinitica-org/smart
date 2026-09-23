import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { InstitutionsModule } from '../institutions/institutions.module.js';
import { JdParseProcessor } from './jd-parse.processor.js';
import { MatchNarrativeService } from './match-narrative.service.js';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { MatchRunProcessor } from './match-run.processor.js';
import { OpeningJdParseService } from './opening-jd-parse.service.js';
import { PlacementMatchController } from './placement-match.controller.js';

@Module({
  imports: [AiGatewayModule, InstitutionsModule, EvidenceModule],
  controllers: [MatchingController, PlacementMatchController],
  providers: [
    MatchingService,
    MatchRunProcessor,
    OpeningJdParseService,
    JdParseProcessor,
    MatchNarrativeService,
  ],
  exports: [MatchingService, OpeningJdParseService],
})
export class MatchingModule {}
