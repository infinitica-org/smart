# ADR-0008: Rate-limit strategy

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Tino + Vishal V
- **Ticket:** S0-TN-04

## Context

Unlimited endpoints will not survive pilot traffic or abuse on public verify routes.

## Decision

- Every route declares RBAC + rate-limit policy in `@smart/contracts` (`http/routes.ts` + `domain/rate-limits.ts`).
- Enforcement: Redis sliding-window (Lua) in API middleware — source of truth for runtime counters.
- Role/default tiers and endpoint overrides are contract data; changing limits is a contracts PR.
- Redis keys always have TTL (`REDIS_TTL_SECONDS`).
- **Unlimited endpoints do not ship.**

## Consequences

- Review rejects routes without a policy.
- Public verify stays tightly capped; B2B keys use separate budgets.
