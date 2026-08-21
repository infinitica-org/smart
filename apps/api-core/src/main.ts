import 'reflect-metadata';
import 'dotenv/config';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { env } from './platform/config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(PinoLogger));
  await app.register(helmet as never, { contentSecurityPolicy: false });
  await app.register(cookie as never);
  await app.register(cors as never, {
    origin: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.enableShutdownHooks();
  await app.listen(env.PORT, env.HOST);

  Logger.log(`SMART API listening on http://${env.HOST}:${String(env.PORT)} (${env.NODE_ENV})`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
