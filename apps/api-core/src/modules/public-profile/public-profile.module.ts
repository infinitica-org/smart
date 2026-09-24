import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PublicProfileController } from './public-profile.controller.js';
import { PublicProfileService } from './public-profile.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PublicProfileController],
  providers: [PublicProfileService],
  exports: [PublicProfileService],
})
export class PublicProfileModule {}
