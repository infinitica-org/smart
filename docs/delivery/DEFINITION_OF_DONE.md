# Definition of Done

> Owner: Tino (System Architect). Applied to **every** ticket, by every engineer, without exception.
> A PR that fails any mandatory item is rejected on the checklist — not on opinion.

A ticket is `Done` when all of the following are true. Copy this into your PR and tick it.

---

## 1. Functional

- [ ] Every acceptance criterion on the ticket is met.
- [ ] Demoed on `develop` at the sprint review, or a `curl`/screenshot/screen recording is attached to the PR.
- [ ] The named failure modes are handled — not just the happy path. (Your module's
      "non-negotiables" in `TEAM.md` §2 are part of the acceptance criteria.)
- [ ] Feature flag added if the change is risky or incomplete. Half-finished behaviour behind a
      flag is acceptable; half-finished behaviour on by default is not.

## 2. Contracts & types

- [ ] Any cross-module type lives in `@smart/contracts` and was merged **before** implementation.
- [ ] No `any`, no `as unknown as`, and no untyped `fetch` at a module or network boundary.
- [ ] Request/response DTOs validated at runtime with Zod (backend) and inferred on the client.
- [ ] Kafka payloads match the contract exactly. Adding a field is fine; changing or removing one
      is a contract PR with every consumer named in the body.

## 3. Tests

- [ ] Unit tests for logic and for the edge cases you thought of while writing it.
- [ ] Integration test for anything crossing a process boundary (DB, Redis, Kafka, R2, LLM) —
      LLM calls are stubbed at the gateway interface, never live in CI.
- [ ] `pnpm test` green locally and in CI.
- [ ] Module coverage ≥ 80 % by the end of Sprint 5 (tracked per module, not repo-wide average).
- [ ] For AI work: golden-set regression run and attached. A prompt change without golden results
      is not reviewable.

## 4. Quality gates (all enforced in CI — don't push to find out)

- [ ] `pnpm lint` — zero errors, zero new warnings.
- [ ] `pnpm typecheck` — zero errors.
- [ ] `pnpm build` — every affected workspace builds.
- [ ] `pnpm format:check` — Prettier clean.
- [ ] Conventional Commit PR title including the ticket ID, e.g.
      `feat(rate-limit): sliding window Lua guard (S1-VV-04)`.
- [ ] ≤ 400 changed lines of hand-written code. If it's bigger, it should have been two tickets.

## 5. Security & limits (a non-negotiable at 1M scale)

- [ ] Endpoint declares its RBAC roles via the guard decorator. There is no implicitly public endpoint.
- [ ] Endpoint declares its rate-limit tier. **Unlimited endpoints do not ship.**
- [ ] All user input validated and bounded (length, size, type, count).
- [ ] No secret in code, in a test fixture, or in a log line. Config comes from validated env only.
- [ ] Every new Redis key has an explicit TTL. Keys without expiry are forbidden.
- [ ] SQL is parameterised — through Prisma, or explicitly parameterised in raw queries.
- [ ] Anything touching an attempt respects `integrity_flag`. A flagged attempt never yields a certificate.

## 6. Observability

- [ ] Structured logs (pino) with `traceId`, `userId` where applicable, and no PII in the message body.
- [ ] At least one Prometheus metric for the new path — a counter for outcomes, a histogram for latency.
- [ ] Errors surface with actionable context, not a bare `500`.
- [ ] A Grafana panel exists if this path can degrade silently.

## 7. Documentation

- [ ] Swagger/OpenAPI decorators on every new endpoint: summary, response types, error codes.
- [ ] `README.md` in your module folder updated — what it does, what it owns, how to run its tests.
- [ ] Runbook in `docs/runbooks/` if this component can page someone at 2 a.m.
- [ ] ADR in `docs/adr/` if you made a decision that constrains anyone else.
- [ ] Known compromise logged in `docs/engineering/TECH_DEBT.md` **in this PR**, not "later".

## 8. Review & merge

- [ ] Self-reviewed the diff before requesting review. Read it as if someone else wrote it.
- [ ] **Tino approved** (mandatory, all PRs).
- [ ] Module owner approved if the PR touches a module you don't own.
- [ ] Squash-merged into `develop`.
- [ ] Ticket moved to `Done` **by the author**, with the merge commit linked.

---

## Definition of Done — Sprint level

A sprint is done when:

- [ ] Every committed `P0` ticket is `Done`.
- [ ] `develop` is green and deployable.
- [ ] The sprint goal sentence from `AGILE_PLAN.md` is demonstrably true in a live demo.
- [ ] Retro actions from the previous sprint were closed or explicitly carried with a reason.
- [ ] The risk register was updated.

## Definition of Done — Release (10 Sep 2026)

See the GA gate in [`AGILE_PLAN.md`](./AGILE_PLAN.md) §12. Sign-off recorded in `RELEASE_SIGNOFF.md`.
