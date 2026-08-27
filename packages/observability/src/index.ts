/**
 * @smart/observability — logging, metrics and correlation.
 *
 * Three things every SMART service gets for free by importing this package:
 *   1. a JSON logger that cannot accidentally log a JWT, an answer key or an email;
 *   2. a single Prometheus registry, so metric names are a contract with Grafana
 *      rather than whatever each module invented;
 *   3. one correlation id that survives HTTP → Kafka → worker.
 *
 * Owner: Vishal V.
 */

export * from './redaction.js';
export * from './logger.js';
export * from './pino-http-options.js';
export * from './metrics.js';
export * from './correlation.js';

export const OBSERVABILITY_VERSION = '0.1.0';
