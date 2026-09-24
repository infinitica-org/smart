import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PublicProfileController } from './public-profile.controller.js';
import { PublicProfileService } from './public-profile.service.js';
import { TrustModule } from '../trust/trust.module.js';

@Module({
  imports: [AuthModule, forwardRef(() => TrustModule)],
  controllers: [PublicProfileController],
  providers: [PublicProfileService],
  exports: [PublicProfileService],
})
export class PublicProfileModule {}
