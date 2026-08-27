import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { API_PREFIX, ALL_RATE_LIMIT_POLICIES, ROUTES, getRateLimitPolicy } from '@smart/contracts';
import { matchContractRoute } from '../../common/interceptors/rate-limit.interceptor.js';

/**
 * Paths that are not product ROUTES: probes, Prometheus, module scaffolds, and
 * Ramansh's ai-gateway aliases that are not yet in the contract registry.
 */
const EXEMPT_SUFFIXES = ['/_meta', '_meta'];
const EXEMPT_PATHS = new Set([
  '/health',
  '/ready',
  `${API_PREFIX}/admin/metrics`,
  '/ai/health',
  `${API_PREFIX}/ai/health`,
]);

describe('declarative throttle matrix (S1-VV-05)', () => {
  it('registers a unique policy key for every matrix row', () => {
    const keys = ALL_RATE_LIMIT_POLICIES.map((policy) => policy.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('maps every contract route onto a registered policy via matchContractRoute', () => {
    for (const route of ROUTES) {
      const concrete = `${API_PREFIX}${fillParams(route.path)}`;
      const matched = matchContractRoute(route.method, concrete);
      expect(matched, `${route.method} ${route.path}`).toBeDefined();
      expect(matched?.rateLimit).toBe(route.rateLimit);
      expect(() => getRateLimitPolicy(route.rateLimit)).not.toThrow();
    }
  });

  it('snapshots method+path → policy so a silent matrix drift fails CI', () => {
    const matrix = Object.fromEntries(
      ROUTES.map((route) => [`${route.method} ${route.path}`, route.rateLimit]),
    );
    expect(matrix).toMatchSnapshot();
  });

  it('requires every Nest controller route to have a contract limit tier', () => {
    const srcRoot = fileURLToPath(new URL('../..', import.meta.url));
    const missing: string[] = [];

    for (const file of walkControllers(srcRoot)) {
      for (const registered of extractControllerRoutes(readFileSync(file, 'utf8'))) {
        if (isExempt(registered.path)) continue;
        const productPath = stripApiPrefix(registered.path);
        const matched = matchContractRoute(registered.method, `${API_PREFIX}${productPath}`);
        if (!matched) {
          missing.push(`${registered.method} ${registered.path} (${file})`);
        }
      }
    }

    expect(missing, missing.join('\n')).toEqual([]);
  });
});

function fillParams(template: string): string {
  return template.replaceAll(/:([A-Za-z]+)/g, 'x');
}

function stripApiPrefix(path: string): string {
  if (path.startsWith(API_PREFIX)) return path.slice(API_PREFIX.length) || '/';
  return path;
}

function isExempt(path: string): boolean {
  if (EXEMPT_PATHS.has(path)) return true;
  return EXEMPT_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

function walkControllers(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'generated' && entry.name !== 'node_modules') {
      found.push(...walkControllers(path));
    } else if (entry.name.endsWith('.controller.ts')) {
      found.push(path);
    }
  }
  return found;
}

function extractControllerRoutes(source: string): { method: string; path: string }[] {
  const controllerExpr = source.match(/@Controller\(([^)]*)\)/)?.[1] ?? "''";
  const prefix = resolvePathExpr(controllerExpr);
  const routes: { method: string; path: string }[] = [];
  const methodRe = /@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/g;
  let match = methodRe.exec(source);
  while (match) {
    const method = match[1]?.toUpperCase() ?? 'GET';
    const leaf = resolvePathExpr(match[2] ?? "''");
    routes.push({ method, path: joinPaths(prefix, leaf) });
    match = methodRe.exec(source);
  }
  return routes;
}

function resolvePathExpr(expr: string): string {
  const trimmed = expr.trim();
  if (!trimmed || trimmed === "''" || trimmed === '""') return '';
  const quoted = trimmed.match(/^['"](.*)['"]$/);
  if (quoted?.[1] !== undefined) return quoted[1];
  const tpl = trimmed.match(/^`([\s\S]*)`$/);
  if (tpl?.[1] !== undefined) return tpl[1].replaceAll('${API_PREFIX}', API_PREFIX);
  if (trimmed === 'API_PREFIX') return API_PREFIX;
  throw new Error(`Unsupported path expression: ${trimmed}`);
}

function joinPaths(prefix: string, leaf: string): string {
  if (!leaf) return prefix || '/';
  if (leaf.startsWith('/')) return leaf;
  const base = prefix.replace(/\/$/, '');
  return `${base}/${leaf}`;
}
