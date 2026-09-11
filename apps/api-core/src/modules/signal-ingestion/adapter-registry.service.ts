import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ConnectableSignalSourceId } from '@smart/contracts';
import type { SignalSourceAdapter } from './adapters/signal-source.adapter.js';
import { GithubSignalAdapter } from './adapters/github-signal.adapter.js';
import { HackerrankSignalAdapter } from './adapters/hackerrank-signal.adapter.js';
import { LeetcodeSignalAdapter } from './adapters/leetcode-signal.adapter.js';

/**
 * Registry of passive signal source adapters keyed by sourceId.
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class AdapterRegistryService {
  private readonly adapters: Map<ConnectableSignalSourceId, SignalSourceAdapter>;

  constructor(
    @Inject(GithubSignalAdapter) github: GithubSignalAdapter,
    @Inject(HackerrankSignalAdapter) hackerrank: HackerrankSignalAdapter,
    @Inject(LeetcodeSignalAdapter) leetcode: LeetcodeSignalAdapter,
  ) {
    this.adapters = new Map<ConnectableSignalSourceId, SignalSourceAdapter>();
    this.adapters.set('GITHUB', github);
    this.adapters.set('HACKERRANK', hackerrank);
    this.adapters.set('LEETCODE', leetcode);
  }

  get(sourceId: ConnectableSignalSourceId): SignalSourceAdapter {
    const adapter = this.adapters.get(sourceId);
    if (!adapter) {
      throw new NotFoundException({
        error: 'unknown_signal_source',
        message: `No adapter registered for sourceId ${sourceId}.`,
        statusCode: 404,
      });
    }
    return adapter;
  }

  list(): readonly SignalSourceAdapter[] {
    return [...this.adapters.values()];
  }
}
