import 'reflect-metadata';
import 'dotenv/config';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
  await app.register(multipart as never, { limits: { fileSize: 5 * 1024 * 1024 } });
  await app.register(cors as never, {
    origin: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  const openApi = new DocumentBuilder()
    .setTitle('SMART API')
    .setDescription(
      'Platform core for role-specific readiness certification. Health probes are unauthenticated; product routes use Bearer JWT.',
    )
    .setVersion(env.APP_VERSION)
    .addBearerAuth()
    .addTag('assessment', 'Attempt lifecycles, item delivery, integrity tracking')
    .addTag('certificate', 'Issuance, visibility control, public verification')
    .addTag('webhooks', 'Outbound HMAC-SHA256 signed event delivery')
    .build();
  const document = SwaggerModule.createDocument(app, openApi);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  app.enableShutdownHooks();
  await app.listen(env.PORT, env.HOST);

  Logger.log(`SMART API listening on http://${env.HOST}:${String(env.PORT)} (${env.NODE_ENV})`);
  Logger.log(`Swagger UI at http://${env.HOST}:${String(env.PORT)}/api/docs`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
