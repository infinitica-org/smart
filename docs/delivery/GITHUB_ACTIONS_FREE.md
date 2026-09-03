# GitHub Actions on the free org plan

> Owner: Tino (CI) · Audience: whoever sees “The job was not started because recent account payments have failed”

SMART is on the **GitHub Free** org plan. That is enough if we stay inside the included minutes and never open a paid overage. It is **not** enough if a card fails or a spending limit trips — GitHub then refuses to **start** any hosted job, including 5-second lockfile checks.

## What the error actually means

```
The job was not started because recent account payments have failed
or your spending limit needs to be increased.
```

This is **billing**, not a red test. Quality gates never ran.

Do this first (org owner, 2 minutes):

1. GitHub → org **infinitica-org** → **Settings → Billing & plans**.
2. Clear the failed payment / expired card, **or** remove the payment method if you do not want paid Actions at all.
3. Set **Actions spending limit to $0**. Included minutes stay free. Overage cannot start, so a runaway workflow cannot surprise-bill you — it just stops.
4. Confirm **Actions minutes** remaining this month (Free private repos: **2,000 Linux minutes**).

Until that page is clean, **no CI and no kvm2 autodeploy will start.** Deploy-dev only runs after a successful CI `workflow_run`.

Do **not** make the repo public just to get unlimited minutes unless the whole team agrees. The tree has env examples and internal docs.

## How we stay on free minutes

| Before (this week)                        | After                                    | Why                                              |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| 4 heavy jobs, each `pnpm install`         | **1** `ci` job, one install              | Minutes are billed **per job**, not per workflow |
| lockfile / merge-main / compose as extras | Same checks, cheap steps inside that job | Three 1-minute jobs still cost 3 minutes         |
| Content Validate on every content path    | Unchanged, path-filtered                 | Rare                                             |
| Deploy after CI                           | Unchanged                                | One extra job only when `dev` is green           |

Rough math: a typical PR used **~25–40 hosted minutes**. The collapsed workflow should land around **8–15**. That is ~130–200 PRs/month on 2,000 minutes if you do not spam `dev`.

**Do not land three squash-merges in one minute.** `cancel-in-progress: true` kills the earlier `dev` CI, so deploy never sees `success`. One push to `dev`, wait for green, then the next.

## If hosted minutes run out anyway

Register **kvm2** as a self-hosted runner (self-hosted jobs do **not** consume the 2,000 minutes). They still will not start if the org has a **failed payment** — fix billing first.

On kvm2, as a dedicated `actions` user (not `deploy`):

```bash
# https://github.com/organizations/infinitica-org/settings/actions/runners/new
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -fsSL -o actions-runner.tar.gz \
  https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/infinitica-org/smart --labels linux,kvm2
./svc.sh install && ./svc.sh start
```

Then change `runs-on: ubuntu-latest` in `.github/workflows/ci.yml` to `runs-on: [self-hosted, linux, kvm2]`. Do that in a follow-up PR after the runner shows **Idle** in the org.

## Local substitute (always works)

```bash
bash scripts/ci-local.sh
```

Same gates as hosted CI: lockfile, compose config, lint, format, typecheck, unit tests, build.

## Branch protection

Required checks used to be `lockfile`, `merge-main`, `compose config`, `lint`, `typecheck`, `unit tests`, `build`. After this change the single required check is **`ci`**. Update org branch protection on `dev` / `qa` / `main` or GitHub will sit on “waiting for required checks.”
