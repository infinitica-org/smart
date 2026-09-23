import { Module } from '@nestjs/common';
import { CorroborationModule } from '../corroboration/corroboration.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { CredentialVerifiedFusionConsumer } from './credential-verified-fusion.consumer.js';
import { ProjectDefenseCompletedFusionConsumer } from './project-defense-completed-fusion.consumer.js';
import { RuleBasedEncoder } from './rule-based.encoder.js';
import { SignalIngestedEncoderConsumer } from './signal-ingested.encoder-consumer.js';
import { SkillDimensionResolver } from './skill-dimension.resolver.js';

@Module({
  imports: [CorroborationModule, EvidenceModule],
  providers: [
    SkillDimensionResolver,
    RuleBasedEncoder,
    // These implement OnModuleInit to subscribe on boot — they must be
    // registered as providers (not just exist as classes) or Nest never
    // instantiates them and their Kafka subscriptions silently never start.
    SignalIngestedEncoderConsumer,
    CredentialVerifiedFusionConsumer,
    ProjectDefenseCompletedFusionConsumer,
  ],
  exports: [RuleBasedEncoder, SkillDimensionResolver],
})
export class SignalEncoderModule {}
