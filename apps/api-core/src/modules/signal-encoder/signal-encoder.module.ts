import { Module } from '@nestjs/common';
import { CorroborationModule } from '../corroboration/corroboration.module.js';
import { CandidateSkillsDiscoveredEncoderConsumer } from './candidate-skills-discovered.encoder-consumer.js';
import { CredentialVerifiedFusionConsumer } from './credential-verified-fusion.consumer.js';
import { RuleBasedEncoder } from './rule-based.encoder.js';
import { SignalIngestedEncoderConsumer } from './signal-ingested.encoder-consumer.js';
import { SkillDimensionResolver } from './skill-dimension.resolver.js';

@Module({
  imports: [CorroborationModule],
  providers: [
    SkillDimensionResolver,
    RuleBasedEncoder,
    // These three implement OnModuleInit to subscribe on boot — they must be
    // registered as providers (not just exist as classes) or Nest never
    // instantiates them and their Kafka subscriptions silently never start.
    SignalIngestedEncoderConsumer,
    CandidateSkillsDiscoveredEncoderConsumer,
    CredentialVerifiedFusionConsumer,
  ],
  exports: [RuleBasedEncoder, SkillDimensionResolver],
})
export class SignalEncoderModule {}
