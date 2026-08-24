# SMART on VPS — kvm2 (dev/qa) and kvm4 (prod)

Policy: [`docs/delivery/BRANCHING.md`](../../docs/delivery/BRANCHING.md) ·
database: [`docs/delivery/DATABASE.md`](../../docs/delivery/DATABASE.md) ·
ADR-0009.

| Host     | Git branch | Compose project | Public TLS (Caddy)                     |
| -------- | ---------- | --------------- | -------------------------------------- |
| **kvm2** | `dev`      | `smart-dev`     | No — use published ports (`3000–3004`) |
| **kvm2** | `qa`       | `smart-qa`      | Yes — `*-qa` hostnames on :80/:443     |
| **kvm4** | `main`     | `smart-prod`    | Yes — production hostnames             |

Only **one** stack per machine may enable profile `vps` (Caddy). On kvm2 that is **qa**.

## 1. DNS

**kvm2 (QA public):** `api-qa` / `app-qa` / `tpo-qa` / `admin-qa` / `verify-qa` → kvm2 IP.

**kvm4 (prod):** `api` / `app` / `tpo` / `admin` / `verify` → kvm4 IP.

## 2. Server setup (each VPS)

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
git clone https://github.com/infinitica-org/smart.git
cd smart
```

On **kvm2**:

```bash
git checkout qa   # or deploy a specific tag
cp .env.qa.example .env.qa
# fill secrets + real hostnames
bash scripts/deploy-vps.sh qa

# optional second stack for integration:
git checkout dev
cp .env.dev.example .env.dev
bash scripts/deploy-vps.sh dev
```

On **kvm4** (brittytino only):

```bash
git checkout main
cp .env.prod.example .env.prod
bash scripts/deploy-vps.sh prod
```

Open **80** and **443** on the host that runs Caddy (kvm2 qa, kvm4 prod).

## 3. Database

Default: Compose Postgres + pgvector (volume per `COMPOSE_PROJECT_NAME`).

Optional: set `DATABASE_URL` to a **per-environment** Supabase Postgres URI. Enable `vector`. Do not share one Supabase project across env. Prisma remains the client — see `docs/delivery/DATABASE.md`.

Migrations (VV only):

```bash
docker compose --env-file .env.qa -f infra/docker/docker-compose.yml --profile apps exec api \
  npx prisma migrate deploy
```

## 4. Laptop (not a VPS)

```bash
cp .env.example .env
pnpm infra:up
pnpm dev:api
```

## 5. Health

- `GET /health` · `GET /ready` · `GET /api/v1/admin/metrics`

Owner: Vishal V (infra) / Tino (release).
