import { AsyncLocalStorage } from 'node:async_hooks';
import pino, { type Logger, type LoggerOptions } from 'pino';
import { REDACTED_PATHS, REDACTION_PLACEHOLDER } from './redaction.js';

/**
 * Structured logger factory.
 *
 * JSON in every environment including development, because a log line that is
 * pretty locally and structured in production is a log line whose fields nobody
 * verified. `pino-pretty` is applied at the terminal, not at the source.
 *
 * Owner: Vishal V.
 */

export interface LoggerContext {
  /** Traces one request across gateway → service → Kafka consumer. */
  readonly correlationId: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly institutionId?: string;
  readonly module?: string;
}

/**
 * Ambient correlation context.
 *
 * Without this, a Kafka consumer three hops from the HTTP request cannot log the
 * correlation id, and debugging a failed evaluation means grepping timestamps —
 * which does not work once two candidates submit in the same second.
 */
const contextStore = new AsyncLocalStorage<LoggerContext>();

export function runWithContext<T>(context: LoggerContext, fn: () => T): T {
  return contextStore.run(context, fn);
}

export function getContext(): LoggerContext | undefined {
  return contextStore.getStore();
}

export interface CreateLoggerOptions {
  readonly serviceName: string;
  readonly level?: LoggerOptions['level'];
  /** Present in log lines so a bug report can be pinned to a deploy. */
  readonly version?: string;
  readonly environment?: string;
  /** Set true only for local terminals. */
  readonly pretty?: boolean;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const base: LoggerOptions = {
    level: options.level ?? 'info',
    base: {
      service: options.serviceName,
      version: options.version ?? 'dev',
      env: options.environment ?? 'local',
    },
    redact: {
      paths: [...REDACTED_PATHS],
      censor: REDACTION_PLACEHOLDER,
      remove: false,
    },
    // Loki and every log viewer expect `level: "info"`, not `level: 30`.
    formatters: {
      level: (label) => ({ level: label }),
    },
    // ISO timestamps: correlating an incident with a Grafana panel by epoch
    // millis wastes minutes we do not have during an outage.
    timestamp: pino.stdTimeFunctions.isoTime,
    // Attach ambient correlation to every line, so no call site has to remember.
    mixin: () => {
      const context = getContext();
      return context ? { ...context } : {};
    },
  };

  if (options.pretty === true) {
    return pino({
      ...base,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
      },
    });
  }

  return pino(base);
}

/** Child logger scoped to a module, so log volume can be filtered per owner. */
export function moduleLogger(parent: Logger, module: string): Logger {
  return parent.child({ module });
}
