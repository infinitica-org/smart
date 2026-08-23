#!/usr/bin/env node
/**
 * Windows PATH often puts standalone pnpm 9 ahead of npm's pnpm 11, which
 * makes `pnpm <script>` die with ERR_PNPM_UNSUPPORTED_ENGINE when
 * package.json has engines.pnpm (that check cannot be softened). We omit
 * engines.pnpm and gate here instead so package scripts can start under 9.x.
 *
 * Behaviour:
 * 1. Warn + tip when PATH has pnpm < 11
 * 2. Non-pnpm commands (docker, bash, …) run immediately under 9.x
 * 3. Nested `pnpm …` / bare lifecycle scripts re-launch via `npx pnpm@11.22.0`
 * 4. `--strict` (preinstall) exits 1 if still on pnpm < 11
 *
 * Usage:
 *   node scripts/ensure-pnpm.mjs                     # gate / re-exec parent script
 *   node scripts/ensure-pnpm.mjs --strict            # fail installs under 9.x
 *   node scripts/ensure-pnpm.mjs docker compose ...  # gate, then run command
 */
import { spawnSync } from 'node:child_process';

const PNPM_PIN = '11.22.0';
const REEXEC = 'SMART_PNPM_REEXEC';

const argv = process.argv.slice(2);
const strict = argv[0] === '--strict';
const cmdArgs = strict ? argv.slice(1) : argv;

function pnpmMajor() {
  const ua = process.env.npm_config_user_agent ?? '';
  const fromUa = ua.match(/pnpm\/(\d+)\./);
  if (fromUa) return Number(fromUa[1]);

  const probe = spawnSync('pnpm', ['-v'], { encoding: 'utf8', shell: true });
  const text = `${probe.stdout ?? ''}${probe.stderr ?? ''}`.trim();
  const fromCli = text.match(/^(\d+)\./m);
  return fromCli ? Number(fromCli[1]) : 0;
}

function tip(major) {
  return `
[smart] pnpm >= 11 required (packageManager = pnpm@${PNPM_PIN}). PATH has pnpm ${major}.x.

Windows (this shell):
  $env:Path = "$env:APPDATA\\npm;" + $env:Path
  pnpm -v

Or:
  corepack enable
  corepack prepare pnpm@${PNPM_PIN} --activate

See docs/delivery/LOCAL_DEV.md §0.
`.trim();
}

function reexecWithPnpm11() {
  const script = process.env.npm_lifecycle_event;
  const args = script
    ? ['--yes', `pnpm@${PNPM_PIN}`, 'run', script]
    : ['--yes', `pnpm@${PNPM_PIN}`, ...cmdArgs];

  console.warn(`[smart] Re-running with pnpm@${PNPM_PIN} …`);
  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, [REEXEC]: '1' },
  });
  process.exit(result.status ?? 1);
}

function runCommand(args) {
  if (args.length === 0) return;
  const result = spawnSync(args[0], args.slice(1), {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

const major = pnpmMajor();
const alreadyReexec = process.env[REEXEC] === '1';
const needsPnpm = cmdArgs.length === 0 || cmdArgs[0] === 'pnpm' || strict;

if (major > 0 && major < 11) {
  console.warn(tip(major));

  // docker / bash / etc. do not need pnpm 11 — run the payload now.
  if (!needsPnpm) {
    runCommand(cmdArgs);
  }

  if (!alreadyReexec) {
    reexecWithPnpm11();
  }

  if (strict) {
    console.error('[smart] Still on pnpm < 11 after re-exec — fix PATH / corepack, then retry.');
    process.exit(1);
  }

  console.warn('[smart] Continuing under pnpm < 11 (not recommended).');
}

runCommand(cmdArgs);
