import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { GithubIntegrationModule } from '../integrations/github/github-integration.module.js';
import { AdapterRegistryService } from './adapter-registry.service.js';
import { GithubSignalAdapter } from './adapters/github-signal.adapter.js';
import { HackerrankSignalAdapter } from './adapters/hackerrank-signal.adapter.js';
import { LeetcodeSignalAdapter } from './adapters/leetcode-signal.adapter.js';
import { HackerrankApiClient } from './clients/hackerrank-api.client.js';
import { LeetcodeStatsClient } from './clients/leetcode-stats.client.js';
import { SignalCircuitBreaker } from './signal-circuit-breaker.js';
import { SignalConnectionStore } from './signal-connection.store.js';
import { SignalIngestionController } from './signal-ingestion.controller.js';
import { SignalIngestionService } from './signal-ingestion.service.js';

@Module({
  imports: [AuditModule, GithubIntegrationModule],
  controllers: [SignalIngestionController],
  providers: [
    SignalCircuitBreaker,
    SignalConnectionStore,
    HackerrankApiClient,
    LeetcodeStatsClient,
    GithubSignalAdapter,
    HackerrankSignalAdapter,
    LeetcodeSignalAdapter,
    AdapterRegistryService,
    SignalIngestionService,
  ],
  exports: [SignalIngestionService],
})
export class SignalIngestionModule {}
