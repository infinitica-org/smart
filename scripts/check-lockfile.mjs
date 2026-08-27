#!/usr/bin/env node
/**
 * Fail if a workspace package.json is missing from pnpm-lock.yaml importers.
 * Catches the CI frozen-lockfile failure before a PR burns four jobs.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, 'pnpm-lock.yaml');

if (!existsSync(lockPath)) {
  console.error('FAIL lockfile: pnpm-lock.yaml is missing');
  process.exit(1);
}

const lock = readFileSync(lockPath, 'utf8').replaceAll('\r\n', '\n');
const importerStart = lock.indexOf('\nimporters:\n');
if (importerStart === -1) {
  console.error('FAIL lockfile: pnpm-lock.yaml has no importers section');
  process.exit(1);
}
const afterImporters = lock.slice(importerStart + '\nimporters:\n'.length);
const packagesStart = afterImporters.search(/\npackages:\n/);
const importerBlock =
  packagesStart === -1 ? afterImporters : afterImporters.slice(0, packagesStart);
const importerPaths = new Set(
  [...importerBlock.matchAll(/^ {2}(\.(?:\/)?|(?:apps|packages|tools|tests)\/[^:]+):/gm)].map(
    (m) => (m[1] === './' ? '.' : m[1]),
  ),
);

const workspaceRoots = ['apps', 'packages', 'tools', 'tests'];
const missing = [];

for (const dir of workspaceRoots) {
  const abs = join(root, dir);
  if (!existsSync(abs)) continue;
  for (const name of readdirSync(abs)) {
    const pkgJson = join(abs, name, 'package.json');
    if (!statSync(join(abs, name)).isDirectory() || !existsSync(pkgJson)) continue;
    const importer = relative(root, join(abs, name)).replaceAll('\\', '/');
    if (!importerPaths.has(importer)) {
      missing.push(importer);
    }
  }
}

if (missing.length > 0) {
  console.error('FAIL lockfile: workspace package.json not in pnpm-lock.yaml importers:');
  for (const path of missing) console.error(`  - ${path}`);
  console.error('Run `pnpm install` and commit pnpm-lock.yaml.');
  process.exit(1);
}

console.log(`ok   lockfile (${importerPaths.size} importers)`);
