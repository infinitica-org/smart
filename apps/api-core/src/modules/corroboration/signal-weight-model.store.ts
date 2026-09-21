import { Inject, Injectable } from '@nestjs/common';
import { SignalWeightModelSchema, type SignalWeightModel } from '@smart/contracts';
import { DEFAULT_SIGNAL_WEIGHT_MODEL, verifySignalWeightModel } from '@smart/scoring-engine';
import { RedisService } from '../../platform/redis/redis.service.js';

const ACTIVE_MODEL_KEY = 'corroboration:signal-weight-model:active';
const LAST_REPORT_KEY = 'corroboration:signal-weight-model:last-report';

/**
 * Redis-backed active corroboration weight model.
 * Falls back to practitioner-frozen defaults until ORION publishes a trained model.
 */
@Injectable()
export class SignalWeightModelStore {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async getActiveModel(): Promise<SignalWeightModel> {
    const raw = await this.redis.get(ACTIVE_MODEL_KEY);
    if (!raw) return DEFAULT_SIGNAL_WEIGHT_MODEL;
    try {
      const parsed = SignalWeightModelSchema.parse(JSON.parse(raw));
      if (!verifySignalWeightModel(parsed)) return DEFAULT_SIGNAL_WEIGHT_MODEL;
      return parsed;
    } catch {
      return DEFAULT_SIGNAL_WEIGHT_MODEL;
    }
  }

  async publishModel(model: SignalWeightModel): Promise<void> {
    if (!verifySignalWeightModel(model)) {
      throw new Error('Refusing to publish weight model with invalid checksum.');
    }
    await this.redis.set(ACTIVE_MODEL_KEY, JSON.stringify(model));
  }

  async saveLastReport(report: unknown): Promise<void> {
    await this.redis.set(LAST_REPORT_KEY, JSON.stringify(report));
  }

  async getLastReport<T>(): Promise<T | null> {
    const raw = await this.redis.get(LAST_REPORT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
