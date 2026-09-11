import { Module } from '@nestjs/common';
import { PublicProfileController } from './public-profile.controller.js';
import { PublicProfileService } from './public-profile.service.js';

@Module({
  controllers: [PublicProfileController],
  providers: [PublicProfileService],
  exports: [PublicProfileService],
})
export class PublicProfileModule {}
