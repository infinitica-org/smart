import { Module } from '@nestjs/common';
import { CorroborationModule } from '../corroboration/corroboration.module.js';
import { RuleBasedEncoder } from './rule-based.encoder.js';
import { SkillDimensionResolver } from './skill-dimension.resolver.js';

@Module({
  imports: [CorroborationModule],
  providers: [SkillDimensionResolver, RuleBasedEncoder],
  exports: [RuleBasedEncoder, SkillDimensionResolver],
})
export class SignalEncoderModule {}
