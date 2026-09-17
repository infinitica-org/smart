# Contributing to SMART

**New engineer:** begin with [`docs/delivery/ENGINEER_START_CHECKLIST.md`](./docs/delivery/ENGINEER_START_CHECKLIST.md) — access provisioning, environment bootstrap, sign-off, first ticket, and pull-request workflow.

Read the following in order before writing code:

1. [`TEAM.md`](./TEAM.md) — ownership by path
2. [`docs/delivery/ENGINEER_GUIDES.md`](./docs/delivery/ENGINEER_GUIDES.md) — day-to-day engineering practice
3. [`docs/delivery/DEFINITION_OF_DONE.md`](./docs/delivery/DEFINITION_OF_DONE.md) — merge criteria
4. [`docs/delivery/AGILE_PLAN.md`](./docs/delivery/AGILE_PLAN.md) — delivery methodology and cadence
5. [`AGENTS.md`](./AGENTS.md) and [`.cursor/`](./.cursor/) — shared agent and human knowledge base and workflow rules
6. [`docs/delivery/LOCAL_DEV.md`](./docs/delivery/LOCAL_DEV.md) — exact local commands
7. [`docs/delivery/BRANCHING.md`](./docs/delivery/BRANCHING.md) — the `main` / `qa` / `dev` branching model

## Non-negotiable rules

- **Feature branches only.** Never commit directly to `main`, `qa`, or `dev`. Branch as `<type>/S<sprint>-<initials>-<nn>-<slug>` from an up-to-date `dev`.
- **Pull request required.** Every shippable change lands via a pull request into `dev` (squash-merge after review). Promotion from `dev` to `qa` to `main` is a separate, deliberate action. A local commit alone is not complete work.
- **Branching policy** is authoritative in [`docs/delivery/BRANCHING.md`](./docs/delivery/BRANCHING.md). The `develop` branch name is deprecated.
- **Quality gates.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm format:check` must pass before a pull request is opened. Git hooks are not bypassed (`--no-verify` is not used).
- **Architecture review is mandatory.** The system architect role does not author feature code and reviews all cross-cutting changes; see [`.github/CODEOWNERS`](./.github/CODEOWNERS).
- **Contract-first development.** Cross-module types live in `@smart/contracts`. Implementations target a merged contract type; parallel or ad hoc DTOs are not introduced.
- **One owner per path.** A contributor who does not own a path opens a pull request for the owner to review rather than merging into it directly.
- **No unbounded endpoints.** Every route carries an explicit rate-limit policy and RBAC role set, declared in `packages/contracts/src/http/routes.ts`.
- **Conventional Commits.** Format: `<type>(<scope>): <summary> (<TICKET>)`, with scopes defined in `commitlint.config.mjs`. Details: [`.cursor/rules/09-commits-and-prs.mdc`](./.cursor/rules/09-commits-and-prs.mdc).
- **Pull request labels.** Every pull request carries exactly one priority label (`P0-blocker` / `P1` / `P2-droppable`), one `area:*` label, and one `sprint-N` label. Optional labels: `needs-contract`, `needs-content`, `blocked`.
- **Pull request size.** No more than 400 hand-written lines of code, and one ticket per pull request.
- **No personal names in file or folder names, or in content.** External stakeholders (product owner, design partner, client, and similar) are referred to by role, not by name — for example `docs/product/PRODUCT_ROADMAP_V1.1_TO_V1.3.md` and "the Product Owner locked V1," never a person's name. Files that exist specifically to record internal ownership (`TEAM.md`, `CODEOWNERS`) are the intentional exception.
- **Deployment verification.** A merge to `dev` or `main` is not considered complete until the corresponding deployment has been confirmed to run to completion and the live environment has been smoke-tested (`/health`, `/ready`, and each public subdomain). A green continuous-integration run confirms the code compiles and passes tests; it does not by itself confirm that a deployment occurred.

Personal working notes (identity, working memory) live in `.cursor/local/` and are excluded from version control — copy the corresponding `*.example.md` files into that directory.

## Local development loop

Full command reference: [`docs/delivery/LOCAL_DEV.md`](./docs/delivery/LOCAL_DEV.md).

```bash
pnpm bootstrap          # install, start data plane, generate Prisma client, seed
pnpm dev:api            # Nest API on :3000
pnpm dev:web            # all four portals, :3001–:3004
```

Seeded credentials for local and non-production environments are environment-specific; see [`docs/delivery/DATABASE.md`](./docs/delivery/DATABASE.md).

## Server operations

See [`infra/vps/README.md`](./infra/vps/README.md). Connect as the designated deployment user, not as `root` — the deployed checkout is synchronized by the continuous-deployment pipeline (`rsync`), not by `git pull`, and is not to be hand-edited. To seed an environment's database: `bash scripts/seed-vps.sh <dev|qa|prod>` (see [`docs/delivery/DATABASE.md`](./docs/delivery/DATABASE.md)).
