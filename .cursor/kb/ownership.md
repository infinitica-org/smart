# Ownership

Authoritative: `TEAM.md` + `.github/CODEOWNERS`. **CODEOWNERS wins** if they disagree.

## People

| Engineer | Role | Feature code? |
|---|---|---|
| Tino | Architect & review | **No** |
| **Vishal V** | Senior Backend — Platform Core | Yes |
| Satheswaran V | Frontend + FS (student/TPO) | Yes |
| Vishal Bharath R | Assessment lifecycle + trust chain | Yes |
| Ramansh | AI / LLM boundaries | Yes |
| Vedika G | Content & data spine | Yes |

Standup 09:30 IST · Architecture Review Board 17:00 IST (Tino).

## Backend modules (`apps/api-core/src/modules`)

| Module | Owner |
|---|---|
| platform, auth, users, rate-limit, sandbox | **Vishal V** |
| assessment, certificate, webhooks | Vishal Bharath |
| ai-gateway, evaluation, matching | Ramansh |
| catalog, calibration, placement, analytics | Vedika |

## Packages / apps

| Path | Owner |
|---|---|
| `packages/contracts`, `config-*`, CI | Tino |
| `packages/observability`, `infra/**`, `scripts/**`, load-tests | **Vishal V** |
| `packages/ui`, `api-client`, web-student, web-tpo, e2e | Satheswaran |
| web-verify, web-admin | Vishal Bharath |
| scoring-engine, prompts | Ramansh |
| content-pipeline | Vedika |

## Initials (branches / tickets)

`TN` Tino · `VV` Vishal V · `SV` Satheswaran · `VB` Vishal Bharath · `RM` Ramansh · `VG` Vedika

Branch: `<type>/S<n>-<initials>-<nn>-<slug>` e.g. `feat/S1-VV-04-redis-rate-limit-guard`
