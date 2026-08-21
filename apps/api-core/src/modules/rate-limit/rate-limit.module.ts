import { Module } from '@nestjs/common';
import { RateLimitInterceptor } from '../../common/interceptors/rate-limit.interceptor.js';
import { RateLimitService } from './rate-limit.service.js';

@Module({
  providers: [RateLimitService, RateLimitInterceptor],
  exports: [RateLimitService, RateLimitInterceptor],
})
export class RateLimitModule {}
