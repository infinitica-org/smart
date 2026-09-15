import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env.js';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    super(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 10_000,
      keepAlive: 30_000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
