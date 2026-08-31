import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  buildPinoBaseOptions,
  getContext,
  type CreateLoggerOptions,
  type LoggerContext,
} from './logger.js';

/**
 * nestjs-pino / pino-http options builder.
 *
 * Access lines carry ALS correlation via `customProps`. Serializers stay tight —
 * full headers/bodies would dump JWTs and answers into Loki.
 *
 * Owner: Vishal V.
 */

/** Successful probes must not flood Loki at info. */
export const HTTP_AUTO_LOG_IGNORE_PATHS: readonly string[] = [
  '/health',
  '/ready',
  '/api/v1/admin/metrics',
];

export type BuildPinoHttpOptionsInput = CreateLoggerOptions;

type RequestWithStashedContext = IncomingMessage & {
  smartLogContext?: LoggerContext;
};

/**
 * Options object for `LoggerModule.forRoot({ pinoHttp })`.
 *
 * Returned as a plain record so this package does not need a hard `pino-http`
 * dependency; nestjs-pino accepts the same shape.
 */
export function buildPinoHttpOptions(options: BuildPinoHttpOptionsInput): Record<string, unknown> {
  const base = buildPinoBaseOptions(options);

  const pinoHttp: Record<string, unknown> = {
    ...base,
    customProps: (req: RequestWithStashedContext, _res: ServerResponse) => {
      const context = getContext() ?? req.smartLogContext;
      return context ? { ...context } : {};
    },
    serializers: {
      req: (req: IncomingMessage & { id?: string; method?: string; url?: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res: ServerResponse & { statusCode?: number }) => ({
        statusCode: res.statusCode,
      }),
    },
    autoLogging: {
      ignore: (req: IncomingMessage & { url?: string }) => {
        const path = (req.url ?? '').split('?')[0] ?? '';
        return HTTP_AUTO_LOG_IGNORE_PATHS.some(
          (ignored) => path === ignored || path.endsWith(ignored),
        );
      },
    },
    quietReqLogger: true,
  };

  if (options.pretty === true) {
    pinoHttp.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
    };
  }

  return pinoHttp;
}

/** Whether an HTTP path is skipped by auto access logging. */
export function shouldIgnoreHttpAccessLog(url: string): boolean {
  const path = url.split('?')[0] ?? '';
  return HTTP_AUTO_LOG_IGNORE_PATHS.some((ignored) => path === ignored || path.endsWith(ignored));
}
