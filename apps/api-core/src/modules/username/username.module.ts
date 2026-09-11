import { Module } from '@nestjs/common';
import { PublicProfileModule } from '../public-profile/public-profile.module.js';
import { BlockedWordsAdminController } from './blocked-words-admin.controller.js';
import { BlockedWordsAdminService } from './blocked-words-admin.service.js';
import { UsernameController } from './username.controller.js';
import { UsernameService } from './username.service.js';

@Module({
  imports: [PublicProfileModule],
  controllers: [UsernameController, BlockedWordsAdminController],
  providers: [UsernameService, BlockedWordsAdminService],
})
export class UsernameModule {}
