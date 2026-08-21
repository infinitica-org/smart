# Local development — exact commands

> Owner: Vishal V (platform) · Reviewed with team onboarding (Sprint 0)  
> Goal: every engineer can run API + four portals against the local data plane.

If anything here disagrees with `README.md`, **this file wins for day-to-day commands** until Tino updates README.

---

## 0. Prerequisites (once per machine)

| Tool               | Required                                         | Notes                                                            |
| ------------------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| **Node.js**        | `>= 22.20` (prefer exact `.nvmrc` → **22.20.0**) | `node -v`                                                        |
| **pnpm**           | **`>= 11.0.0`** (repo pins `11.22.0`)            | `pnpm -v` — **9.x will fail** with `ERR_PNPM_UNSUPPORTED_ENGINE` |
| **Docker Desktop** | Recommended                                      | Postgres, Redis, Redpanda, MinIO                                 |
| **Git**            | Yes                                              | Feature branches only — see `CONTRIBUTING.md`                    |

### pnpm 11 on Windows (common failure)

Standalone pnpm 9 often sits earlier on `PATH` than npm’s global pnpm 11.

```powershell
npm install -g pnpm@11.22.0
# This session:
$env:Path = "$env:APPDATA\npm;" + $env:Path
pnpm -v   # must print 11.x
```

Put `%APPDATA%\npm` **before** `%LOCALAPPDATA%\pnpm` in your user PATH, then open a **new** terminal.

### macOS / Linux

```bash
corepack enable
corepack prepare pnpm@11.22.0 --activate
pnpm -v
```

---

## 1. Clone and env

```bash
cd smart          # repo root (where package.json lives)
cp .env.example .env
```

Do **not** commit `.env`. Defaults are fine for local.

**Redis URL:** `.env.example` uses `REDIS_URL=redis://127.0.0.1:6380` because Windows often already binds host `6379`. Docker maps host **6380 → container 6379**.

---

## 2. One-shot bootstrap (preferred)

Needs Docker Desktop **running**, and a shell that can run bash scripts (`Git Bash`, WSL, or macOS/Linux):

```bash
pnpm bootstrap
```

That: installs deps → starts data plane → Prisma generate → migrate → seed.

**Windows PowerShell without bash:** run the manual sequence in §3 instead.

---

## 3. Manual sequence (PowerShell-friendly)

```powershell
# From repo root; ensure pnpm 11 (see §0)
$env:Path = "$env:APPDATA\npm;" + $env:Path

pnpm install
pnpm --filter @smart/contracts build

# Docker data plane only (NOT the Next/API images)
pnpm infra:up

# Wait until Postgres is healthy, then:
pnpm db:generate
pnpm db:deploy
pnpm db:seed
```

Check containers:

```powershell
pnpm infra:ps
# expect: postgres, redis, redpanda, minio — healthy/up
```

---

## 4. Run apps (host — recommended for daily work)

**Terminal A — API**

```powershell
$env:Path = "$env:APPDATA\npm;" + $env:Path
pnpm dev:api
# http://localhost:3000/health
# http://localhost:3000/ready   ← postgres + redis must be up
```

**Terminal B — all four portals**

```powershell
$env:Path = "$env:APPDATA\npm;" + $env:Path
$env:NEXT_PUBLIC_API_URL = "http://localhost:3000"
pnpm dev:web
```

| App     | URL                          |
| ------- | ---------------------------- |
| API     | http://localhost:3000/health |
| Student | http://localhost:3001        |
| TPO     | http://localhost:3002        |
| Admin   | http://localhost:3003        |
| Verify  | http://localhost:3004        |

Or one portal:

```powershell
pnpm --filter @smart/web-student dev
```

### Seeded logins (local only)

Password for all: `ChangeMe!Dev`

- `student@smart.local`
- `tpo@smart.local`
- `admin@smart.local`

---

## 5. What Docker does _not_ start by default

`pnpm infra:up` / plain `docker compose up` starts **only the data plane**.

API + four webs live under Compose profile **`apps`** (heavier images, no Next HMR):

```powershell
pnpm infra:apps    # build/run containerized api + webs — VPS/integration style
```

**Day-to-day:** data plane in Docker, API + frontends on the host (`dev:api` / `dev:web`). That is intentional.

---

## 6. Smoke checks

```powershell
# API
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/ready

# Frontends (expect 200)
foreach ($p in 3001,3002,3003,3004) {
  (Invoke-WebRequest "http://localhost:$p" -UseBasicParsing).StatusCode
}
```

```bash
curl -s http://localhost:3000/ready
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/
```

---

## 7. Quality before PR

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

Branch / commit / PR rules: `CONTRIBUTING.md` and `.cursor/rules/09-commits-and-prs.mdc`.

---

## 8. Common failures

| Symptom                                    | Fix                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `ERR_PNPM_UNSUPPORTED_ENGINE` Got 9.x      | Use pnpm 11 — §0                                                                                |
| `/ready` redis down / ioredis `ECONNRESET` | Confirm `REDIS_URL=…6380` and `pnpm infra:up`; don’t use host 6379 on Windows                   |
| TPO / `:3002` “protocol violation”         | Another process on 3002 (e.g. misconfigured local Redis). Free the port.                        |
| Frontends unstyled                         | Pull latest (Tailwind `@source` for `@smart/ui`). Restart `pnpm dev:web`. Hard-refresh browser. |
| `/health` 500 / Reflector undefined        | Pull latest API DI `@Inject` fixes; restart `pnpm dev:api`                                      |
| `EADDRINUSE` on 3000–3004                  | Stop the other Node/Docker process using that port                                              |
| `pnpm bootstrap` fails on Windows          | Use Git Bash/WSL **or** §3 manual steps                                                         |

Stop data plane:

```powershell
pnpm infra:down
```

---

## 9. Agent / Cursor setup (optional)

```powershell
cp .cursor/local/IDENTITY.example.md .cursor/local/IDENTITY.md
cp .cursor/local/preferences.example.md .cursor/local/preferences.md
cp .cursor/local/working-memory.example.md .cursor/local/working-memory.md
```

Edit identity/prefs. Those files are gitignored.

---

## Related docs

- `README.md` — overview
- `CONTRIBUTING.md` — PR / ownership rules
- `docs/delivery/ENGINEER_GUIDES.md` — your role
- `infra/vps/README.md` — VPS / full Compose apps profile
- `AGENTS.md` — agent entrypoint
