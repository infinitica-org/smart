import { Module } from '@nestjs/common';

import { SkillClaimAutoDeclareService } from './skill-claim-auto-declare.service.js';

@Module({
  providers: [SkillClaimAutoDeclareService],
  exports: [SkillClaimAutoDeclareService],
})
export class SkillClaimDeclareModule {}
