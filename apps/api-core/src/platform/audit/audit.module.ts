import { Global, Module } from '@nestjs/common';
import { AuditPublisherService } from './audit-publisher.service.js';

@Global()
@Module({
  providers: [AuditPublisherService],
  exports: [AuditPublisherService],
})
export class AuditModule {}
