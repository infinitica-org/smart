# CI/CD & Deployment Architecture (GitHub Teams)

> Owner: Tino (System Architect) · Applies to: SMART Monorepo

SMART leverages the **GitHub Teams** plan for CI/CD, providing **3,000 Linux minutes per month**. We rely exclusively on GitHub-hosted `ubuntu-latest` runners (2 vCPU / 7 GB RAM) to keep builds isolated, reproducible, and to free our VPS environments from heavy compilation workloads.

## 1. CI Pipeline Architecture

Our CI pipeline (`.github/workflows/ci.yml`) runs on `push` and `pull_request` against our three core branches: `main`, `qa`, and `dev`.

### Caching Strategy (Saving Minutes)

To optimize our 3,000 monthly minutes, we heavily utilize caching:

- **`actions/setup-node`:** Caches the `pnpm` global store to avoid downloading unchanged npm packages.
- **Turborepo Cache (`.turbo`):** Caches the outputs of our Next.js and backend builds. If a package (e.g., `web-student`) hasn't changed, Turbo instantly replays the cached output instead of recompiling it, saving massive amounts of compute time.

### Concurrency

Because we run on isolated `ubuntu-latest` runners, `turbo` executes tasks (linting, typechecking, building) concurrently using all available cores, rather than being throttled.

## 2. PR Governance & Flow Enforcement

We enforce a strict linear promotion path: **`dev` → `qa` → `main`**.

This is automatically validated by our `.github/workflows/enforce-pr-flow.yml` workflow, which ensures:

1. Pull Requests targeting `qa` **must** originate from `dev`.
2. Pull Requests targeting `main` **must** originate from `qa`.
3. Only the user `@brittytino` is permitted to author a PR targeting `main`.

_Note: This workflow is a secondary defense. The primary defense should be GitHub's Branch Protection Rules configured in the repository settings._

## 3. Automated Deployments

Deployments trigger automatically when a PR is merged (or a push occurs) and the subsequent CI run passes successfully.

- **Dev Environment:** Managed by `deploy-dev.yml`. Triggers on a successful CI run on the `dev` branch. Syncs to the VPS and executes `deploy-vps.sh dev`.
- **QA Environment:** Managed by `deploy-qa.yml`. Triggers on a successful CI run on the `qa` branch. Syncs to the VPS and executes `deploy-vps.sh qa`.
- **Production Environment:** Managed by `deploy-prod.yml`. Triggers on a successful CI run on the `main` branch. Syncs to the VPS and executes `deploy-vps.sh prod`.

## 4. Zero-Downtime / Blue-Green Deployment

To eliminate downtime during VPS deployments, we use a Blue-Green deployment strategy.

Because SMART uses Docker Compose with statically bound host ports (e.g., `3000`), Docker cannot start a new container before stopping the old one if they share the same port. To solve this, our deployment script (`scripts/blue-green-deploy.sh`) orchestrates a color-coded environment swap:

1. **Isolation:** We run the app as either the `smart-<env>-blue` or `smart-<env>-green` docker-compose project.
2. **Build & Start:** The script pulls code, determines the _inactive_ color, builds the images, and starts the inactive stack in the background.
3. **Health Check & Migrations:** It waits for the `api` container of the new stack to report as healthy and applies Prisma migrations.
4. **Traffic Swap:** Once verified, a standalone reverse proxy (e.g., Caddy running outside of docker-compose) is reloaded to route traffic from the old color to the new color.
5. **Teardown:** The old docker-compose stack is gracefully shut down.

_To fully utilize this script, the Caddy service must be extracted from the `docker-compose.yml` into a host-level system service._

## 5. Troubleshooting: "Minute Limits"

If you see CI jobs stuck in a `Queued` state or refusing to start with billing errors:

1. Verify you haven't exceeded the 3,000 minutes provided by the GitHub Teams plan.
2. Ensure there are no failed payment methods on the GitHub organization billing page.
3. If minutes run out, you can set up a dedicated self-hosted runner (e.g., a cheap Hetzner VM) and temporarily revert the `runs-on` targets in the workflows from `ubuntu-latest` to your self-hosted labels. **Do not** share a CI runner with your live application VPS.
