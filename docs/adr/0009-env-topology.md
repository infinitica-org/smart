# ADR-0009: Branch, VPS, and database topology

- **Status:** Accepted
- **Date:** 2026-08-24
- **Deciders:** Tino
- **Ticket:** S0-TN-03

## Context

The team needs three promotion stages (`dev` → `qa` → `main`) and two VPS hosts (kvm2, kvm4). The running stack is Prisma + self-hosted Postgres only.

## Decision

1. Long-lived git branches: `dev`, `qa`, `main`. Feature PRs target `dev`.
2. **kvm2** hosts **dev** and **qa** Compose projects. **kvm4** hosts **production** (`main`) only.
3. Only one stack per host binds Caddy `:80/:443`. On kvm2 that is **qa**. Dev uses published app ports or a second hostname set without a second Caddy.
4. Database is **PostgreSQL + pgvector** via `DATABASE_URL`, self-hosted in Docker Compose on each VPS.
5. One database per environment. No sharing.

## Consequences

- Deploy script: `bash scripts/deploy-vps.sh <dev|qa|prod>` with matching `.env.<name>`.
- Detail: [`docs/delivery/DATABASE.md`](../delivery/DATABASE.md), [`infra/vps/README.md`](../../infra/vps/README.md).
