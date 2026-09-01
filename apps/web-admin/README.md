# SMART Administration Console (`web-admin`)

System operator console for SMART. Access is restricted to `SUPER_ADMIN` (and the portal role gate in `PortalAuthGate`).

The UI follows the Studio Admin shell: collapsible Lucide sidebar, sticky header with command search (`⌘J`) and light/dark/system theme, shadcn cards/tables.

## Routing

| Route                      | Purpose                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `/`                        | Redirects to `/admin` (preserves `?accessToken=`)                                     |
| `/admin`                   | Platform overview: tenant counts, holds, verification backlog, plan mix, recent audit |
| `/admin/institutions`      | Create and search institutions                                                        |
| `/admin/institutions/[id]` | Tenant profile, admins, students, holds, flags, activity                              |
| `/admin/companies`         | Create and search companies                                                           |
| `/admin/companies/[id]`    | Company profile, plan, hold/deactivate                                                |
| `/admin/verification`      | Approve or reject self-onboarded tenants                                              |
| `/admin/plans`             | Plan entitlement flags                                                                |
| `/admin/users`             | Global student search (audit-logged profile view)                                     |
| `/admin/audit`             | Platform audit log                                                                    |
| `/admin/integrity`         | Flagged attempts: clear or void                                                       |
| `/admin/health`            | AI gateway circuits and spend                                                         |
| `/admin/rate-limits`       | Placeholder until override APIs exist                                                 |
| `/admin/webhooks`          | Placeholder until webhook APIs exist                                                  |

## Layout

- Root layout: theme provider, tooltip provider, auth gate. No sidebar on `/auth/*`.
- `/admin/layout.tsx`: `SessionHoldWall` + collapsible sidebar + header.
- Local shadcn kit lives in `src/components/ui`. `@smart/ui` is used only for auth walls.
