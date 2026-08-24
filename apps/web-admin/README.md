# SMART Administration Console (`web-admin`)

This is the system operator and institutional management interface for SMART. Access is restricted to `SUPER_ADMIN` and `INSTITUTION_ADMIN` roles.

## Routing Schema

| Route Path | Type | Navigables | Purpose / Functional Target |
|---|---|---|---|
| `/` | Static | None | Auto-redirects to `/admin/health`. |
| `/admin/health` | Static | Platform Health | Metrics dashboard displaying api-core Fastify, Prisma databases, and LLM primary/fallback (Claude/Gemini) circuits states. |
| `/admin/integrity` | Static | Integrity Queue | Proctoring reviews backlog queue allowing admins to release or void anomaly flags. |
| `/admin/users` | Static | User Directory | Institutional domains matching catalog settings and roles distributions panel. |
| `/admin/rate-limits` | Static | Rate Limits | Realtime Redis API limits adjustments console for critical pathways. |
| `/admin/webhooks` | Static | Webhook Outbox | Outbound HMAC-SHA256 partner ERP integrations registering. |

## Layout Structure

* **Root Layout (`src/app/layout.tsx`)**: Integrates the **Sidebar Navigation Layout**. Left segment embeds the static `<AdminSidebar>` containing active tracking, and the right segment yields the actual dynamic routes content.
* **Theme Styling**: Standard Dark theme wrapper (`dark` class on root html), styled cleanly using tailwind theme tokens.
* **UI Controls**: Direct imports of `@smart/ui` visual elements (`Alert`, `Card`, `Button`, `Input`) aligned with shared TSConfig.
