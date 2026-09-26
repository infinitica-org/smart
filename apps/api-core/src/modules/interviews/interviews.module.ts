import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/prisma/prisma.module.js';
import { InterviewsController } from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
