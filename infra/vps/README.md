# SMART on a VPS

This repo is intended to run on **one VPS** (2 vCPU / 4 GB RAM minimum; 4 vCPU / 8 GB recommended) with Docker Compose and Caddy for TLS.

## 1. DNS

Create A records pointing at the VPS public IP:

| Host                 | Service                         |
| -------------------- | ------------------------------- |
| `api.example.com`    | Nest API                        |
| `app.example.com`    | Student portal                  |
| `tpo.example.com`    | TPO console                     |
| `admin.example.com`  | Admin console                   |
| `verify.example.com` | Public certificate verification |

## 2. Server setup

```bash
# Ubuntu 24.04 example
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-v2
sudo usermod -aG docker "$USER"   # then log out/in
git clone git@github.com:hiresapien/smart.git
cd smart
cp .env.example .env
```

Edit `.env`:

- `JWT_SECRET` — 32+ random characters
- `POSTGRES_PASSWORD` / `MINIO_ROOT_PASSWORD`
- `API_HOST`, `STUDENT_HOST`, `TPO_HOST`, `ADMIN_HOST`, `VERIFY_HOST`
- `PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL` = `https://api.example.com`
- `CORS_ORIGINS` = the four https portal origins
- `NODE_ENV=production`
- `LOG_PRETTY=false`

Open ports **80** and **443**. Caddy obtains Let's Encrypt certificates automatically.

## 3. Deploy

```bash
bash scripts/deploy-vps.sh
```

That builds every image and starts:

- PostgreSQL 16 + pgvector
- Redis 7
- Redpanda (Kafka API)
- MinIO (S3-compatible; swap for Cloudflare R2 in prod by changing `S3_*`)
- `api`, four Next.js apps
- Caddy reverse proxy
- Prometheus + Grafana (`--profile obs`)

Then migrate and seed once:

```bash
docker compose -f infra/docker/docker-compose.yml --profile apps exec api \
  sh -c 'npx prisma migrate deploy && npx tsx prisma/seed.ts'
```

## 4. Local data plane only

Engineers on laptops do **not** need the app images:

```bash
pnpm infra:up     # postgres, redis, redpanda, minio
pnpm dev:api
pnpm --filter @smart/web-student dev
```

## 5. Health

- API liveness: `GET /health`
- API readiness: `GET /ready` (Postgres + Redis)
- Metrics: `GET /api/v1/admin/metrics`

Owner: Vishal V (infra) / Tino (release).
