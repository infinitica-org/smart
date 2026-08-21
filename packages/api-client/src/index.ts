/**
 * @smart/api-client — the only way a SMART frontend talks to the API.
 *
 * Raw `fetch` is blocked by ESLint in the web apps, because four things must
 * happen on every request and none of them survive being left to memory:
 *
 *   1. the response is validated against `@smart/contracts`, so a shape change
 *      fails at the boundary with the route name attached;
 *   2. the correlation id travels, so a candidate's bug report is traceable;
 *   3. a 401 triggers exactly one refresh, shared across concurrent requests;
 *   4. a 429 respects `Retry-After` instead of hammering the limiter.
 *
 * Owner: Satheswaran V.
 */

export * from './errors.js';
export * from './client.js';
export * from './resources.js';
export * from './query-keys.js';

export const API_CLIENT_VERSION = '0.1.0';
