import 'reflect-metadata';
import './platform/config/load-dotenv.bootstrap.js';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/**
 * Background worker entry (S2-VV-03).
 *
 * Local `pnpm dev` already runs processors inside the API process. Use this
 * entry when you want a dedicated worker process (staging/prod). Do not run
 * both the API processors and this worker against the same Redis in prod
 * unless you have split processor registration.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  Logger.log('SMART worker process started (BullMQ processors + Kafka outbox/consumer)');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
