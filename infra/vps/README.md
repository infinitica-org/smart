# SMART on VPS — kvm2 (dev) and kvm4 (prod)

Policy: [`docs/delivery/BRANCHING.md`](../../docs/delivery/BRANCHING.md) ·
database: [`docs/delivery/DATABASE.md`](../../docs/delivery/DATABASE.md) ·
ADR-0009.

| Host     | Git branch | Compose project | Public TLS (Caddy)          | Domain                   |
| -------- | ---------- | --------------- | --------------------------- | ------------------------ |
| **kvm2** | `dev`      | `smart-dev`     | Yes — owns :80/:443 on kvm2 | `dev.becomesmart.online` |
| **kvm2** | `qa`       | `smart-qa`      | Not currently deployed      | —                        |
| **kvm4** | `main`     | `smart-prod`    | Yes                         | `becomesmart.online`     |

Deploys are automatic: a push to `dev` or `main` runs CI, and on green CI the
`deploy-dev.yml` / `deploy-prod.yml` GitHub Actions workflow rsyncs the repo to
the matching host over SSH (as the `deploy` user, key-only) and runs
`scripts/deploy-vps.sh`. Manual runs of that script still work the same way for
break-glass / first-time setup.

## 1. DNS (A records)

| Host                                                                                                                | → IP    |
| ------------------------------------------------------------------------------------------------------------------- | ------- |
| `becomesmart.online`, `www.` (CNAME → apex), `api.`, `app.`, `tpo.`, `admin.`, `verify.`, `studio.`, `db.`          | kvm4 IP |
| `dev.becomesmart.online`, `dev.api.`, `dev.app.`, `dev.tpo.`, `dev.admin.`, `dev.verify.`, `dev.studio.`, `dev.db.` | kvm2 IP |

## 2. Server setup (each VPS) — one-time

Both hosts run Ubuntu 24.04, hardened the same way: Docker CE, `deploy` (docker
group, key-only SSH, no sudo needed for deploys), `ufw` (22/80/443 only),
`fail2ban` on sshd, `PasswordAuthentication no` / `PermitRootLogin
prohibit-password`. Postgres/PgBouncer/Redis/Redpanda/MinIO/Prisma Studio/
Grafana/Prometheus/Loki are all bound to `127.0.0.1` in `docker-compose.yml` —
reach them only via an SSH tunnel (`ssh -L 5432:127.0.0.1:5432 deploy@<ip>`),
never directly from the internet.

```bash
git clone https://github.com/infinitica-org/smart.git ~/smart
cd ~/smart
```

Run this **as the `deploy` user** — the checkout lives at `~deploy/smart`
(i.e. `/home/deploy/smart`), never `/root/smart`. After the first CI deploy,
`~deploy/smart` is kept in sync by `rsync`, not `git`: there is no `.git`
there and `git pull` will fail. Break-glass edits go through a normal PR to
`dev`/`main`; do not hand-edit or `git`-manage the server checkout.

On **kvm2**: `git checkout dev`, `cp .env.dev.example .env.dev`, fill secrets,
`bash scripts/deploy-vps.sh dev`.

On **kvm4** (brittytino only): `git checkout main`, `cp .env.prod.example
.env.prod`, fill secrets, `bash scripts/deploy-vps.sh prod`.

## 3. Database

Docker Postgres + pgvector, one volume per host (`smart-dev` / `smart-prod`
compose projects) — physically separate databases, distinct generated
passwords, never shared. See `docs/delivery/DATABASE.md`. Postgres is
**not** published to the internet; browse it via the DB admin UI below or an
SSH tunnel.

Migrations (`prisma migrate deploy`, already-committed migrations only) run
automatically at the end of `scripts/deploy-vps.sh` / every CI deploy.

Seeding is manual and not run by CI (it is a one-time / break-glass op, not
part of every deploy). The running `api` container is a slim production
image with no `pnpm` and no TypeScript source, so `prisma/seed.ts` cannot run
via `docker compose exec api ...`. Use the wrapper instead, from
`~deploy/smart`:

```bash
bash scripts/seed-vps.sh dev    # kvm2 — smart-dev
bash scripts/seed-vps.sh qa     # kvm2 — smart-qa
bash scripts/seed-vps.sh prod   # kvm4 — smart-prod
```

## 4. DB admin UI

Two tools, same gate: HTTP Basic Auth (`DB_BASIC_AUTH_USER` /
`DB_BASIC_AUTH_HASH` in the env file) **and** the Postgres login itself. Raw
port 5432 is never exposed publicly.

- `https://studio.becomesmart.online` / `https://dev.studio.becomesmart.online` — Prisma Studio.
- `https://db.becomesmart.online` / `https://dev.db.becomesmart.online` — Adminer (raw SQL / table admin).

## 5. Laptop (not a VPS)

```bash
cp .env.example .env
pnpm infra:up
pnpm dev:api
```

## 6. CI/CD secrets (GitHub repo secrets, set once)

`DEV_SSH_HOST`, `DEV_SSH_USER=deploy`, `DEV_SSH_KEY` (private key) and the
`PROD_` equivalents. No database/JWT/API secrets ever leave the servers —
GitHub Actions only holds enough to SSH in and run the deploy script.

## 7. Health

- `GET /health` · `GET /ready` · `GET /api/v1/admin/metrics`

Owner: Vishal V (infra) / Tino (release).
