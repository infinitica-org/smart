# Architecture Decision Records

Accepted ADRs for SMART. One decision per file. Owner: Tino (`@brittytino`).

| ADR                                        | Title                                   | Status   |
| ------------------------------------------ | --------------------------------------- | -------- |
| [0001](./0001-stack.md)                    | Primary application stack               | Accepted |
| [0002](./0002-package-manager.md)          | pnpm + Turborepo workspace              | Accepted |
| [0003](./0003-contract-first.md)           | Contract-first cross-module types       | Accepted |
| [0004](./0004-module-boundaries.md)        | Module ownership boundaries             | Accepted |
| [0005](./0005-ai-failover.md)              | AI provider failover                    | Accepted |
| [0006](./0006-tier-authority.md)           | Tier assignment authority               | Accepted |
| [0007](./0007-migration-stewardship.md)    | Prisma migration stewardship            | Accepted |
| [0008](./0008-rate-limit-strategy.md)      | Rate-limit strategy                     | Accepted |
| [0009](./0009-env-topology.md)             | Branch, VPS, and database topology      | Accepted |
| [0010](./0010-structured-logging.md)       | Structured server logging               | Accepted |
| [0011](./0011-prd-v1-frozen.md)            | Freeze SMART PRD v1 MMP pack            | Accepted |
| [0012](./0012-mmp-placement-matching.md)   | V1 matching is rules + TPO-mediated     | Accepted |
| [0013](./0013-v1-retry-and-credentials.md) | One reattempt, 35-day refresh, licenses | Accepted |
| [0014](./0014-proctoring-sidecar.md)       | Proctoring CV sidecar + snapshots       | Proposed |

If an ADR conflicts with `ARCHITECTURE.md`, open a PR to fix the ADR or the architecture doc — do not leave them divergent.
