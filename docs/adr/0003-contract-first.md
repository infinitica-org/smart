# ADR-0003: Contract-first cross-module types

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Tino
- **Ticket:** S0-TN-04 / S0-TN-02

## Context

Five implementers sharing one API will drift if each invents DTOs. Integration time is the scarcest resource in a 21-day runway.

## Decision

1. All cross-module types, HTTP DTOs, route policies, and Kafka payloads live only in **`@smart/contracts`**.
2. Consumer proposes schema → Tino merges → producer and consumer implement in parallel against the merged type.
3. No `any` / `as unknown as` at module boundaries.
4. Breaking changes bump package version and name every consumer in the PR body.
5. Tag `contracts-v0.1.0` freezes Sprint 0 baseline.

## Consequences

- Duplicate DTOs in apps are a review reject.
- Contract PRs are first-class and usually merged same day at the 17:00 board.
