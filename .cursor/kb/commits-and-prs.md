# Commits & PR labels (cheat sheet)

Full rule: `.cursor/rules/09-commits-and-prs.mdc` · lint: `commitlint.config.mjs`.

## Commit

```text
<type>(<scope>): <imperative summary> (<S#-XX-##>)
```

Types: `feat` `fix` `perf` `refactor` `test` `docs` `build` `ci` `chore` `revert` `content` `prompt` `adr`  
Scope: one of platform, auth, users, rate-limit, sandbox, assessment, … (see commitlint).

## PR tags (required)

- Priority: `P0-blocker` | `P1` | `P2-droppable`
- Area: `area:backend` | `area:frontend` | `area:ai` | `area:data` | `area:infra` | `area:contracts`
- Sprint: `sprint-0` … `sprint-5`
- Optional: `needs-contract` | `needs-content` | `blocked`
