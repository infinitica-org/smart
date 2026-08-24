# ADR-0007: Prisma migration stewardship

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Tino + Vishal V
- **Ticket:** S0-TN-04

## Context

Concurrent migrations from six engineers will break local and VPS databases.

## Decision

- Only **Vishal V** authors and applies Prisma migrations.
- Others open an issue/ticket with table, field, type, and ticket ID; he batches forward-only migrations.
- No destructive down-migrations in production path without an explicit ADR amend.
- Schema lives with `api-core`; generated client is not hand-edited.

## Consequences

- Faster, safer schema evolution.
- Feature PRs that need columns must wait on the batched migration or pair with VV in-sprint.
