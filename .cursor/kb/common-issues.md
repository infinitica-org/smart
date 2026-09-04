# Common issues (engineering KB)

Allen asked for this log. Point juniors here before a senior takes the keyboard.

## Merge conflict markers in a merged PR

`<<<<<<<` / `=======` / `>>>>>>>` in a file means the PR was merged dirty. CSS/TS will not parse. `#174` landed this in `packages/config-tailwind/theme.css` on `dev`.

Do not squash-merge if GitHub says **DIRTY** or you still see those strings. Resolve on the feature branch, push, wait for the `ci` check, then merge.

```bash
rg -n '^<<<<<<<|^>>>>>>>' --glob '!**/node_modules/**'
```

## GitHub Actions will not start

Org billing: failed card or spending limit. Hosted jobs never run. See `docs/delivery/GITHUB_ACTIONS_FREE.md`. Local: `bash scripts/ci-local.sh`.

## Seed / kvm2 login

Seeded users are only `admin@smart.local`, `tpo@smart.local`, `student@smart.local` — password `ChangeMe!Dev`. Run seed as `deploy` (`~/smart`), not `root` (`/root/smart` does not exist).

## Escalation (Allen)

Primary senior window 21:00–22:00 IST. Outside that, emergencies only. Bring a brief: problem, what you tried, module, proposed fix, risks, the actual question. Seniors do not take over the PR.
